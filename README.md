# Malaria Detection : Détection Automatique du Paludisme

## Description

Malaria Detection est une application web complète pour la détection automatique du paludisme à partir d'images microscopiques de frottis sanguins. Le projet combine des techniques avancées d'intelligence artificielle pour la segmentation des cellules sanguines et la détection des parasites du paludisme.

## Caractéristiques Principales

- **Segmentation Automatique** : Utilisation du modèle TernausNet pour isoler précisément les cellules sanguines individuelles
- **Détection des Parasites** : Ensemble de modèles EfficientNet-B0 pour une détection fiable des cellules infectées
- **Interface Web Interactive** : Application React moderne pour l'analyse et la visualisation des résultats
- **Annotation Manuelle** : Possibilité d'annoter et de sauvegarder les résultats pour améliorer le dataset
- **API REST Documentée** : Interface API complète avec documentation Swagger

## Architecture Technique

### Backend (Flask)

- **Segmentation des Cellules** :
  - Modèle : TernausNet (variante U-Net)
  - Performance : 97.87% de précision sur l'ensemble d'entraînement
  - Dataset : 2,656 images (1,328 originales + 1,328 masques)

- **Détection du Paludisme** :
  - Modèle : Ensemble EfficientNet-B0 avec Snapshot Ensemble
  - Performance :
    - F1 Score : 99.37%
    - Précision : 99.52%
    - Rappel : 99.23%
  - Dataset : 27,558 images équilibrées

### Frontend (React)

- Interface utilisateur moderne avec Material-UI
- Visualisation interactive des résultats
- Support pour l'annotation manuelle
- Gestion des images et des résultats

## Installation

### Prérequis

- Python 3.8+
- Node.js 14+
- pip et npm

### Backend

```bash
# Cloner le repository
git clone [URL_DU_REPO]
cd malaria

# Créer un environnement virtuel
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur Flask
python app.py
```

### Frontend

```bash
# Aller dans le dossier frontend
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Utilisation

1. Accédez à l'application via `http://localhost:3000`
2. Téléchargez une image de frottis sanguin
3. Attendez l'analyse automatique
4. Visualisez les résultats et les cellules détectées
5. Optionnellement, annotez manuellement les résultats

## Documentation API

L'API REST est documentée avec Swagger et accessible à `http://localhost:5000/docs`. Les principaux endpoints sont :

- `POST /detection/detect` : Analyse une image pour détecter le paludisme
- `POST /annotations/save` : Sauvegarde les annotations manuelles
- `GET /detection/health` : Vérifie l'état de l'API

## Références

### Publications

1. Mishra, S. (2021). *Malaria Parasite Detection using Efficient Neural Ensembles*. Journal of Electronics, Electromedical Engineering, and Medical Informatics.
2. Depto et al. (2021). *Automatic segmentation of blood cells from microscopic slides: a comparative analysis*. Tissue and Cell.

### Datasets

- **Détection** : 27,558 images de cellules (équilibrées)
- **Segmentation** : 2,656 images (1,328 originales + masques)

## Licence

[Spécifier la licence]

## Contributeurs

[Liste des contributeurs]

## Contact

[Informations de contact]
