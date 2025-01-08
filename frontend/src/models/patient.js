import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { auth } from '../config/firebase';

const PATIENTS_COLLECTION = 'patients';
const ANALYSES_COLLECTION = 'analyses';

export const createPatient = async (patientData) => {
  try {
    const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), {
      ...patientData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
};

export const getPatients = async (doctorId) => {
  try {
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('doctorId', '==', doctorId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting patients:', error);
    throw error;
  }
};

export const saveAnalysis = async (patientId, analysisData) => {
  try {
    const docRef = await addDoc(collection(db, ANALYSES_COLLECTION), {
      patientId,
      ...analysisData,
      comments: [],
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
};

export const getPatientAnalyses = async (patientId) => {
  try {
    const q = query(
      collection(db, ANALYSES_COLLECTION),
      where('patientId', '==', patientId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting patient analyses:', error);
    throw error;
  }
};

export const addAnalysisComment = async (analysisId, comment) => {
  try {
    const analysisRef = doc(db, ANALYSES_COLLECTION, analysisId);
    const analysisDoc = await getDoc(analysisRef);
    
    if (!analysisDoc.exists()) {
      throw new Error('Analysis not found');
    }

    const comments = analysisDoc.data().comments || [];
    comments.push({
      text: comment,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser.uid
    });

    await updateDoc(analysisRef, { comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};
