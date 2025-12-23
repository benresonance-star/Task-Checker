import { create } from 'zustand';
import { db, storage, auth } from '../lib/firebase';
import { 
  collection, onSnapshot, 
  doc, setDoc, updateDoc, deleteDoc, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ProjectDocItem } from '../types';
import { generateUUID } from '../utils/uuid';

interface DocumentState {
  documents: ProjectDocItem[];
  loading: boolean;
  currentFolderId: string; // 'root' is top level
  
  // Actions
  setFolder: (folderId: string) => void;
  initializeProjectDocs: (projectId: string) => () => void;
  createFolder: (projectId: string, name: string, parentId: string) => Promise<void>;
  uploadFile: (projectId: string, file: File, parentId: string) => Promise<void>;
  deleteItem: (projectId: string, item: ProjectDocItem) => Promise<void>;
  moveItem: (projectId: string, itemId: string, newParentId: string) => Promise<void>;
  renameItem: (projectId: string, itemId: string, newName: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  loading: false,
  currentFolderId: 'root',

  setFolder: (folderId) => set({ currentFolderId: folderId }),

  initializeProjectDocs: (projectId) => {
    set({ loading: true });
    const docsRef = collection(db, 'projects', projectId, 'documents');
    
    // Check if default folders exist
    getDocs(docsRef).then(async (snapshot) => {
      if (snapshot.empty) {
        const defaults = [
          { name: 'Our Documents', isDefault: true },
          { name: 'Authorities', isDefault: true },
          { name: 'Consultants', isDefault: true },
          { name: 'Others', isDefault: true }
        ];
        for (const f of defaults) {
          const id = generateUUID();
          await setDoc(doc(db, 'projects', projectId, 'documents', id), {
            id,
            name: f.name,
            type: 'folder',
            parentId: 'root',
            isDefault: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: auth.currentUser?.uid || 'system'
          });
        }
      }
    });

    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ProjectDocItem));
      set({ documents: docs, loading: false });
    });

    return unsubscribe;
  },

  createFolder: async (projectId, name, parentId) => {
    const id = generateUUID();
    await setDoc(doc(db, 'projects', projectId, 'documents', id), {
      id,
      name,
      type: 'folder',
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: auth.currentUser?.uid || 'unknown'
    });
  },

  uploadFile: async (projectId, file, parentId) => {
    const id = generateUUID();
    const storagePath = `projects/${projectId}/documents/${id}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    await setDoc(doc(db, 'projects', projectId, 'documents', id), {
      id,
      name: file.name,
      type: 'file',
      parentId,
      storagePath,
      downloadURL,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: auth.currentUser?.uid || 'unknown'
    });
  },

  deleteItem: async (projectId, item) => {
    if (item.type === 'file' && item.storagePath) {
      await deleteObject(ref(storage, item.storagePath));
    }
    await deleteDoc(doc(db, 'projects', projectId, 'documents', item.id));
  },

  moveItem: async (projectId, itemId, newParentId) => {
    await updateDoc(doc(db, 'projects', projectId, 'documents', itemId), {
      parentId: newParentId,
      updatedAt: Date.now()
    });
  },

  renameItem: async (projectId, itemId, newName) => {
    await updateDoc(doc(db, 'projects', projectId, 'documents', itemId), {
      name: newName,
      updatedAt: Date.now()
    });
  }
}));

