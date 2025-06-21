#!/usr/bin/env python3
"""
Gmail API Setup Script for HackHub
"""

import os
import json
from pathlib import Path

def setup_gmail_api():
    """Setup Gmail API configuration"""
    print("🔧 Gmail API Setup for HackHub")
    print("=" * 40)
    
    # Check if service account file exists
    service_account_file = "hackhub-service-account.json"
    
    if not Path(service_account_file).exists():
        print(f"❌ Service account file '{service_account_file}' not found!")
        print("\n📋 To get the service account file:")
        print("1. Go to Google Cloud Console: https://console.cloud.google.com/")
        print("2. Navigate to: APIs & Services → Credentials")
        print("3. Find your service account: hackhub@hackhub-463514.iam.gserviceaccount.com")
        print("4. Click on the service account name")
        print("5. Go to 'Keys' tab")
        print("6. Click 'Add Key' → 'Create new key'")
        print("7. Select 'JSON' format")
        print("8. Download and save as 'hackhub-service-account.json' in project root")
        return False
    
    # Validate service account file
    try:
        with open(service_account_file, 'r') as f:
            service_account_data = json.load(f)
        
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in service_account_data]
        
        if missing_fields:
            print(f"❌ Invalid service account file. Missing fields: {missing_fields}")
            return False
        
        print(f"✅ Service account file validated")
        print(f"📧 Service account email: {service_account_data['client_email']}")
        
    except Exception as e:
        print(f"❌ Error reading service account file: {e}")
        return False
    
    # Update .env file
    env_path = Path('.env')
    if not env_path.exists():
        print("❌ .env file not found. Please run this script from the project root.")
        return False
    
    # Read current .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update email configuration
    updated_lines = []
    config_updated = False
    
    for line in lines:
        if line.startswith('EMAIL_SERVICE_TYPE='):
            updated_lines.append('EMAIL_SERVICE_TYPE=gmail_api\n')
            config_updated = True
        elif line.startswith('GOOGLE_APPLICATION_CREDENTIALS='):
            updated_lines.append(f'GOOGLE_APPLICATION_CREDENTIALS={service_account_file}\n')
        elif line.startswith('GMAIL_SERVICE_ACCOUNT_EMAIL='):
            updated_lines.append(f'GMAIL_SERVICE_ACCOUNT_EMAIL={service_account_data["client_email"]}\n')
        elif line.startswith('GMAIL_IMPERSONATE_USER='):
            updated_lines.append('GMAIL_IMPERSONATE_USER=hackon25.team@gmail.com\n')
        else:
            updated_lines.append(line)
    
    # Add missing configuration if not found
    if not config_updated:
        updated_lines.extend([
            '\n# Gmail API Configuration\n',
            'EMAIL_SERVICE_TYPE=gmail_api\n',
            f'GOOGLE_APPLICATION_CREDENTIALS={service_account_file}\n',
            f'GMAIL_SERVICE_ACCOUNT_EMAIL={service_account_data["client_email"]}\n',
            'GMAIL_IMPERSONATE_USER=hackon25.team@gmail.com\n'
        ])
    
    # Write updated .env
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)
    
    print(f"✅ Gmail API configured successfully!")
    print(f"📧 Service account: {service_account_data['client_email']}")
    print(f"📤 From email: hackon25.team@gmail.com")
    print(f"🔧 Service type: Gmail API")
    
    print("\n🚀 Next steps:")
    print("1. Restart your server: cd server && python -m uvicorn main:app --reload")
    print("2. Test the configuration: curl http://localhost:8000/api/email/test")
    print("3. Register for a hackathon to test automatic emails!")
    
    return True

def check_domain_delegation():
    """Check if domain-wide delegation is needed"""
    print("\n🔍 Domain-Wide Delegation Check")
    print("=" * 30)
    
    from_email = "hackon25.team@gmail.com"
    
    if from_email.endswith('@gmail.com'):
        print("✅ Using @gmail.com address - Domain-wide delegation may not be required")
        print("📝 The service account will try to send emails directly")
    else:
        print("⚠️ Using custom domain - Domain-wide delegation required")
        print("📋 Configure domain-wide delegation in Google Admin Console:")
        print("1. Go to: https://admin.google.com/")
        print("2. Navigate to: Security → API Controls → Domain-wide Delegation")
        print("3. Add your service account Client ID")
        print("4. Add scopes: https://www.googleapis.com/auth/gmail.send")

if __name__ == "__main__":
    if setup_gmail_api():
        check_domain_delegation()
    else:
        print("\n❌ Gmail API setup failed. Please check the instructions above.")
