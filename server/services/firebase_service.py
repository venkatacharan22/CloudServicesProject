import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
from typing import Optional, Dict, Any
import json

class FirebaseService:
    def __init__(self):
        self.app = None
        self.db = None
        self.initialize_firebase()
    
    def initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Try multiple service account file paths
                possible_paths = [
                    os.getenv('FIREBASE_ADMIN_SDK_PATH'),
                    os.path.join(os.path.dirname(__file__), '..', 'utils', 'firebase-admin-sdk.json'),
                    os.path.join(os.path.dirname(__file__), '..', '..', 'firebase-admin-sdk.json'),
                    os.path.join(os.path.dirname(__file__), '..', '..', 'hackhub-service-account.json'),
                    'firebase-admin-sdk.json',
                    'hackhub-service-account.json'
                ]

                cred = None
                for path in possible_paths:
                    if path and os.path.exists(path):
                        print(f"Using Firebase service account: {path}")
                        cred = credentials.Certificate(path)
                        break

                if not cred:
                    print("No service account file found, using default credentials")
                    cred = credentials.ApplicationDefault()

                # Initialize the app
                self.app = firebase_admin.initialize_app(cred)
            else:
                self.app = firebase_admin.get_app()
            
            # Initialize Firestore
            self.db = firestore.client()
            print("Firebase initialized successfully")
            
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise e
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token and return user info"""
        try:
            import asyncio
            from concurrent.futures import ThreadPoolExecutor

            # Run blocking Firebase calls in thread pool to avoid blocking event loop
            loop = asyncio.get_event_loop()

            with ThreadPoolExecutor() as executor:
                # Verify token in thread pool
                decoded_token = await loop.run_in_executor(
                    executor, auth.verify_id_token, token
                )

                # Get user record in thread pool
                user_record = await loop.run_in_executor(
                    executor, auth.get_user, decoded_token['uid']
                )

            return {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': user_record.display_name,
                'picture': user_record.photo_url,
                'provider': decoded_token.get('firebase', {}).get('sign_in_provider'),
                'custom_claims': decoded_token.get('custom_claims', {})
            }
        except Exception as e:
            raise Exception(f"Invalid token: {str(e)}")
    
    async def get_user_profile(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        try:
            doc_ref = self.db.collection('users').document(uid)
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            raise Exception(f"Error getting user profile: {str(e)}")
    
    async def create_user_profile(self, uid: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user profile in Firestore"""
        try:
            doc_ref = self.db.collection('users').document(uid)
            doc_ref.set(profile_data)
            return profile_data
        except Exception as e:
            raise Exception(f"Error creating user profile: {str(e)}")
    
    async def update_user_profile(self, uid: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile in Firestore"""
        try:
            doc_ref = self.db.collection('users').document(uid)
            doc_ref.update(updates)
            
            # Return updated profile
            return await self.get_user_profile(uid)
        except Exception as e:
            raise Exception(f"Error updating user profile: {str(e)}")
    
    async def set_custom_claims(self, uid: str, claims: Dict[str, Any]):
        """Set custom claims for a user"""
        try:
            auth.set_custom_user_claims(uid, claims)
        except Exception as e:
            raise Exception(f"Error setting custom claims: {str(e)}")
    
    # Firestore helper methods
    async def create_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> str:
        """Create a document in Firestore"""
        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.set(data)
            return document_id
        except Exception as e:
            raise Exception(f"Error creating document: {str(e)}")
    
    async def get_document(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document from Firestore"""
        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            raise Exception(f"Error getting document: {str(e)}")
    
    async def update_document(self, collection: str, document_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a document in Firestore"""
        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.update(updates)
            
            # Return updated document
            return await self.get_document(collection, document_id)
        except Exception as e:
            raise Exception(f"Error updating document: {str(e)}")
    
    async def delete_document(self, collection: str, document_id: str):
        """Delete a document from Firestore"""
        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.delete()
        except Exception as e:
            raise Exception(f"Error deleting document: {str(e)}")
    
    async def query_collection(self, collection: str, filters: Optional[list] = None, 
                             order_by: Optional[str] = None, limit: Optional[int] = None) -> list:
        """Query a collection with optional filters"""
        try:
            query = self.db.collection(collection)
            
            # Apply filters
            if filters:
                for filter_item in filters:
                    field, operator, value = filter_item
                    query = query.where(field, operator, value)
            
            # Apply ordering
            if order_by:
                query = query.order_by(order_by)
            
            # Apply limit
            if limit:
                query = query.limit(limit)
            
            docs = query.stream()
            results = []
            
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                results.append(data)
            
            return results
        except Exception as e:
            raise Exception(f"Error querying collection: {str(e)}")
    
    async def add_to_collection(self, collection: str, data: Dict[str, Any]) -> str:
        """Add a document to a collection with auto-generated ID"""
        try:
            doc_ref = self.db.collection(collection).add(data)
            return doc_ref[1].id
        except Exception as e:
            raise Exception(f"Error adding to collection: {str(e)}")

# Global instance
firebase_service = FirebaseService()
