from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_restx import Api, Resource, fields
from routes.imagekit_auth import setup_imagekit_routes
import numpy as np
import cv2
from PIL import Image
import io
import tensorflow as tf
from skimage import measure
import os
import logging
import json
import base64
import datetime

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Définition de la classe FixedDropout personnalisée
class FixedDropout(tf.keras.layers.Dropout):
    def _get_noise_shape(self, inputs):
        if self.noise_shape is None:
            return self.noise_shape
        return tuple([inputs.shape[i] if self.noise_shape[i] is None else self.noise_shape[i]
                     for i in range(len(self.noise_shape))])

# Enregistrer la classe personnalisée
custom_objects = {'FixedDropout': FixedDropout}

app = Flask(__name__)
CORS(app)

# Setup ImageKit routes
setup_imagekit_routes(app)

# Initialiser l'API Swagger
api = Api(
    app,
    version='1.0',
    title='API de Détection du Paludisme',
    description='API pour la détection automatique du paludisme dans les images microscopiques',
    doc='/docs'
)

# Créer les namespaces
ns_detection = api.namespace('detection', description='Opérations de détection du paludisme')
ns_annotations = api.namespace('annotations', description='Gestion des annotations')

# Définir les modèles de données pour la documentation
cell_model = api.model('Cell', {
    'cell_id': fields.Integer(required=True, description='Identifiant unique de la cellule'),
    'bbox': fields.List(fields.Float, required=True, description='Coordonnées de la boîte englobante [minr, minc, maxr, maxc]'),
    'is_infected': fields.Boolean(required=True, description='Indique si la cellule est infectée')
})

detection_response = api.model('DetectionResponse', {
    'cells': fields.List(fields.Nested(cell_model)),
    'summary': fields.Raw(description='Résumé des résultats de détection')
})

annotation_input = api.model('AnnotationInput', {
    'image_id': fields.String(required=True, description='Identifiant unique de l\'image'),
    'annotations': fields.List(fields.Nested(cell_model), required=True, description='Liste des annotations de cellules'),
    'image': fields.String(required=True, description='Image en base64')
})

# Charger les modèles
detection_models = []
try:
    for i in range(1, 6):
        model_path = f'../models/detection/model_snapshot_{i}.h5'
        logger.info(f"Chargement du modèle de détection {i} depuis {model_path}")
        model = tf.keras.models.load_model(model_path, custom_objects=custom_objects)
        detection_models.append(model)
    logger.info("Tous les modèles de détection ont été chargés avec succès")
except Exception as e:
    logger.error(f"Erreur lors du chargement des modèles de détection: {str(e)}")
    raise

try:
    logger.info("Chargement du modèle de segmentation")
    segmentation_model = tf.keras.models.load_model('../models/segmentation/ternausnet_malaria_model.keras', custom_objects=custom_objects)
    logger.info("Modèle de segmentation chargé avec succès")
except Exception as e:
    logger.error(f"Erreur lors du chargement du modèle de segmentation: {str(e)}")
    raise

def preprocess_image(image, target_size=(135, 135)):
    """
    Prétraitement de l'image pour la préparer à la détection
    """
    if len(image.shape) == 2:
        # Si l'image est en niveaux de gris, la convertir en RGB
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:
        # Si l'image est en RGBA, la convertir en RGB
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
    
    # Redimensionner l'image
    img = cv2.resize(image, target_size)
    # Normaliser les valeurs des pixels
    img = img / 255.0
    return img

def segment_cells(image):
    """
    Utilise le modèle de segmentation pour isoler les cellules
    """
    # Prétraiter l'image pour la segmentation
    processed_img = preprocess_image(image, target_size=(128, 128))
    # Prédire le masque de segmentation
    mask = segmentation_model.predict(np.expand_dims(processed_img, axis=0))[0]
    # Binariser le masque
    mask = (mask > 0.5).astype(np.uint8)
    # Redimensionner le masque à la taille originale de l'image
    mask = cv2.resize(mask, (image.shape[1], image.shape[0]))
    return mask

def extract_individual_cells(image, mask, padding=10):
    """
    Extrait chaque cellule individuelle à partir du masque de segmentation
    """
    # Identifier les régions connectées dans le masque
    labels = measure.label(mask)
    cells = []
    bounding_boxes = []
    
    for region in measure.regionprops(labels):
        if region.area < 100:  # Ignorer les très petites régions
            continue
            
        # Obtenir les coordonnées de la boîte englobante
        minr, minc, maxr, maxc = region.bbox
        
        # Ajouter un padding
        minr = max(0, minr - padding)
        minc = max(0, minc - padding)
        maxr = min(image.shape[0], maxr + padding)
        maxc = min(image.shape[1], maxc + padding)
        
        # Extraire la cellule
        cell = image[minr:maxr, minc:maxc]
        cells.append(cell)
        bounding_boxes.append((minr, minc, maxr, maxc))
    
    return cells, bounding_boxes

def ensemble_predict_cell(cell):
    """
    Utilise l'ensemble des modèles pour faire une prédiction sur une cellule
    """
    processed_cell = preprocess_image(cell, target_size=(135, 135))
    predictions = []
    
    # Obtenir les prédictions de chaque modèle
    for model in detection_models:
        pred = model.predict(np.expand_dims(processed_cell, axis=0))[0]
        predictions.append(pred)
    
    # Calculer la moyenne des prédictions
    mean_prediction = np.mean(predictions)
    std_prediction = np.std(predictions)
    votes = sum(1 for pred in predictions if pred > 0.5)
    
    return {
        'mean_prediction': float(mean_prediction),
        'std_prediction': float(std_prediction),
        'votes': int(votes),
        'individual_predictions': [float(p) for p in predictions],
        'is_infected': votes >= 3  # Majorité des modèles
    }

@ns_detection.route('/health')
class HealthCheck(Resource):
    @api.doc('health_check')
    @api.response(200, 'API opérationnelle')
    def get(self):
        """Vérifie que l'API est opérationnelle"""
        return {
            "status": "ok",
            "message": "L'API de détection du paludisme est opérationnelle"
        }

@ns_detection.route('/detect')
class MalariaDetection(Resource):
    @api.doc('detect_malaria')
    @api.expect(api.parser().add_argument('image', location='files', type='FileStorage', required=True))
    @api.response(200, 'Détection réussie', detection_response)
    @api.response(400, 'Image invalide')
    @api.response(500, 'Erreur serveur')
    def post(self):
        """Détecte le paludisme dans une image microscopique"""
        try:
            if 'image' not in request.files:
                return {"error": "Aucune image n'a été fournie"}, 400

            file = request.files['image']
            image_bytes = file.read()
            
            # Convertir les bytes en image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Format d'image non valide"}, 400

            # Segmenter les cellules
            mask = segment_cells(image)
            cells, bboxes = extract_individual_cells(image, mask)
            
            # Prédire pour chaque cellule
            results = []
            for i, (cell, bbox) in enumerate(zip(cells, bboxes)):
                prediction = ensemble_predict_cell(cell)
                results.append({
                    "cell_id": i,
                    "bbox": list(bbox),  # Convertir le tuple en liste
                    "is_infected": prediction['is_infected'],
                    "confidence": prediction['mean_prediction'] if prediction['is_infected'] else 1 - prediction['mean_prediction'],
                    "metrics": {
                        "mean_score": prediction['mean_prediction'],
                        "std_prediction": prediction['std_prediction'],
                        "positive_votes": prediction['votes']
                    }
                })
            
            # Calculer les statistiques
            total_cells = len(results)
            infected_cells = sum(1 for r in results if r["is_infected"])
            infection_rate = infected_cells / total_cells if total_cells > 0 else 0
            
            return {
                "cells": results,
                "summary": {
                    "total_cells": total_cells,
                    "infected_cells": infected_cells,
                    "infection_rate": infection_rate,
                    "has_malaria": infected_cells > 0,
                    "malaria_type": "Plasmodium falciparum" if infected_cells > 0 else "Non détecté"
                }
            }

        except Exception as e:
            logger.error(f"Erreur lors de la détection: {str(e)}", exc_info=True)
            return {"error": str(e)}, 500

@ns_annotations.route('/save')
class SaveAnnotations(Resource):
    @api.doc('save_annotations')
    @api.expect(annotation_input)
    @api.response(200, 'Annotations sauvegardées avec succès')
    @api.response(400, 'Données invalides')
    @api.response(500, 'Erreur serveur')
    def post(self):
        """Sauvegarde les annotations manuelles des utilisateurs"""
        try:
            data = request.json
            if not data or 'image_id' not in data or 'annotations' not in data:
                return {"error": "Données d'annotation invalides"}, 400

            # Créer le dossier annotations s'il n'existe pas
            os.makedirs('../annotations', exist_ok=True)

            # Sauvegarder les annotations dans un fichier JSON
            annotation_file = os.path.join('../annotations', f"{data['image_id']}.json")
            
            # Si le fichier existe déjà, charger les annotations existantes
            existing_annotations = []
            if os.path.exists(annotation_file):
                with open(annotation_file, 'r') as f:
                    existing_annotations = json.load(f)

            # Ajouter la nouvelle annotation avec un horodatage
            new_annotation = {
                'timestamp': datetime.datetime.now().isoformat(),
                'cells': data['annotations']
            }
            existing_annotations.append(new_annotation)

            # Sauvegarder toutes les annotations
            with open(annotation_file, 'w') as f:
                json.dump(existing_annotations, f, indent=2)

            # Sauvegarder l'image originale si fournie
            if 'image' in data:
                image_folder = os.path.join('annotations', 'images')
                os.makedirs(image_folder, exist_ok=True)
                image_path = os.path.join(image_folder, f"{data['image_id']}.jpg")
                
                # Décoder l'image base64 et la sauvegarder
                image_data = base64.b64decode(data['image'].split(',')[1])
                with open(image_path, 'wb') as f:
                    f.write(image_data)

            return {
                "status": "success",
                "message": "Annotations sauvegardées avec succès"
            }

        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde des annotations: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "details": "Une erreur s'est produite lors de la sauvegarde des annotations"
            }, 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
