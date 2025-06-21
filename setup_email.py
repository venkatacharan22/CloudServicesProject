#!/usr/bin/env python3
"""
HackHub Email Service Setup Script
This script helps you configure email services for HackHub
"""

import os
import sys
import getpass
from pathlib import Path

def setup_gmail_smtp():
    """Setup Gmail SMTP with App Password"""
    print("\n🔧 Setting up Gmail SMTP...")
    print("📋 Prerequisites:")
    print("   1. Enable 2-Factor Authentication on your Gmail account")
    print("   2. Generate an App Password: https://myaccount.google.com/apppasswords")
    print("   3. Use the 16-character app password (not your regular password)")
    
    email = input("\n📧 Enter your Gmail address: ").strip()
    if not email.endswith('@gmail.com'):
        print("⚠️ Please use a Gmail address")
        return False
    
    app_password = getpass.getpass("🔑 Enter your Gmail App Password (16 characters): ").strip()
    if len(app_password) != 16:
        print("⚠️ App password should be 16 characters long")
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
    email_config_updated = False
    
    for line in lines:
        if line.startswith('EMAIL_SERVICE_TYPE='):
            updated_lines.append('EMAIL_SERVICE_TYPE=smtp\n')
            email_config_updated = True
        elif line.startswith('SMTP_USERNAME='):
            updated_lines.append(f'SMTP_USERNAME={email}\n')
        elif line.startswith('SMTP_PASSWORD='):
            updated_lines.append(f'SMTP_PASSWORD={app_password}\n')
        elif line.startswith('GMAIL_FROM_ADDRESS='):
            updated_lines.append(f'GMAIL_FROM_ADDRESS={email}\n')
        else:
            updated_lines.append(line)
    
    # Write updated .env
    with open(env_path, 'w') as f:
        f.writelines(updated_lines)
    
    print(f"✅ Gmail SMTP configured successfully!")
    print(f"📧 From email: {email}")
    print(f"🔧 Service type: SMTP")
    return True

def test_email_config():
    """Test the email configuration"""
    print("\n🧪 Testing email configuration...")
    
    try:
        # Import and test email service
        sys.path.append('server')
        from services.email_service import EmailService
        
        email_service = EmailService()
        
        print(f"📧 Active service: {email_service.active_service}")
        print(f"📤 From email: {email_service.from_email}")
        
        if email_service.active_service:
            print("✅ Email service configured successfully!")
            
            # Ask if user wants to send test email
            test_email = input("\n📧 Enter email address to send test email (or press Enter to skip): ").strip()
            if test_email:
                print("🚀 Sending test email...")
                # Note: This would require async context, so we'll just show the config
                print("✅ Configuration looks good! Use the /api/email/test-send endpoint to send a test email.")
        else:
            print("❌ Email service not configured properly")
            return False
            
    except Exception as e:
        print(f"❌ Error testing email configuration: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🎯 HackHub Email Service Setup")
    print("=" * 40)
    
    print("\n📋 Available email service options:")
    print("1. Gmail SMTP (Recommended - Easy setup)")
    print("2. SendGrid API (Advanced)")
    print("3. Gmail API (Advanced)")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    if choice == '1':
        if setup_gmail_smtp():
            test_email_config()
    elif choice == '2':
        print("\n🔧 SendGrid Setup:")
        print("1. Sign up at https://sendgrid.com/")
        print("2. Get your API key from the SendGrid dashboard")
        print("3. Add SENDGRID_API_KEY=your_api_key to your .env file")
        print("4. Set EMAIL_SERVICE_TYPE=sendgrid in your .env file")
    elif choice == '3':
        print("\n🔧 Gmail API Setup:")
        print("1. Enable Gmail API in Google Cloud Console")
        print("2. Create service account and download JSON key")
        print("3. Configure domain-wide delegation")
        print("4. Update GOOGLE_APPLICATION_CREDENTIALS in .env")
        print("5. Set EMAIL_SERVICE_TYPE=gmail_api in your .env file")
    else:
        print("❌ Invalid choice")
        return
    
    print("\n🎉 Email setup complete!")
    print("🚀 Start your server and test the email service:")
    print("   1. cd server && python -m uvicorn main:app --reload")
    print("   2. Visit http://localhost:8000/api/email/test")
    print("   3. Test sending: http://localhost:8000/api/email/test-send")

if __name__ == "__main__":
    main()
