import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import base64
import json

# For SendGrid (optional)
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, To
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

# For Google Gmail API
try:
    from googleapiclient.discovery import build
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    GMAIL_API_AVAILABLE = True
except ImportError:
    GMAIL_API_AVAILABLE = False

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # SMTP Configuration (Primary)
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')

        # Email service configuration
        self.email_service_type = os.getenv('EMAIL_SERVICE_TYPE', 'smtp')
        self.from_email = os.getenv('GMAIL_FROM_ADDRESS', 'hackon25.team@gmail.com')
        self.from_name = os.getenv('GMAIL_FROM_NAME', 'HackHub Team')

        # Gmail API configuration (Secondary)
        self.service_account_email = os.getenv('GMAIL_SERVICE_ACCOUNT_EMAIL')
        self.service_account_file = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        self.use_gmail_api = (GMAIL_API_AVAILABLE and
                             self.email_service_type == 'gmail_api' and
                             self.service_account_file)

        # SendGrid configuration (Tertiary)
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.use_sendgrid = SENDGRID_AVAILABLE and self.sendgrid_api_key

        # Determine which service to use (with fallback priority)
        self.active_service = self._determine_active_service()

        # Initialize the appropriate service
        if self.active_service == 'gmail_api':
            self._init_gmail_api()
        elif self.active_service == 'sendgrid':
            self.sg = SendGridAPIClient(api_key=self.sendgrid_api_key)
            logger.info("✅ Email service initialized with SendGrid")
        elif self.active_service == 'smtp':
            logger.info("✅ Email service initialized with SMTP")
        else:
            logger.warning("⚠️ Email service not properly configured")

    def _determine_active_service(self):
        """Determine which email service to use based on configuration"""
        # Priority: Gmail API -> SMTP -> SendGrid (Gmail API preferred when configured)
        if self.use_gmail_api and self.email_service_type == 'gmail_api':
            return 'gmail_api'
        elif self.smtp_username and self.smtp_password:
            return 'smtp'
        elif self.use_sendgrid:
            return 'sendgrid'
        else:
            return None

    def _init_gmail_api(self):
        """Initialize Gmail API service"""
        try:
            # Define the scopes
            SCOPES = [
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.compose'
            ]

            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_file, scopes=SCOPES)

            # Check if we need to impersonate a user (for domain-wide delegation)
            impersonate_user = os.getenv('GMAIL_IMPERSONATE_USER')
            if impersonate_user and not impersonate_user.endswith('@gmail.com'):
                # Only use delegation for custom domains, not @gmail.com
                delegated_credentials = credentials.with_subject(impersonate_user)
                logger.info(f"🔄 Using domain-wide delegation to impersonate: {impersonate_user}")
            else:
                # Use service account directly for @gmail.com or no impersonation
                delegated_credentials = credentials
                logger.info("🔄 Using service account directly (no delegation needed for @gmail.com)")

            # Build the Gmail service
            self.gmail_service = build('gmail', 'v1', credentials=delegated_credentials)
            logger.info("✅ Gmail API service initialized successfully")

        except Exception as e:
            logger.error(f"❌ Failed to initialize Gmail API: {e}")
            logger.error(f"Make sure the service account file exists and has proper permissions")
            logger.error(f"Service account file: {self.service_account_file}")
            self.use_gmail_api = False
    
    async def send_email(self, to: str, subject: str, content: str, content_type: str = "text/html") -> Dict[str, Any]:
        """Send a single email with automatic fallback"""
        logger.info(f"📧 Attempting to send email to {to} using {self.active_service}")

        # Try primary service
        try:
            if self.active_service == 'smtp':
                result = await self._send_email_smtp(to, subject, content, content_type)
                if result['status'] == 'sent':
                    logger.info(f"✅ Email sent successfully via SMTP to {to}")
                    return result
            elif self.active_service == 'gmail_api':
                result = await self._send_email_gmail_api(to, subject, content, content_type)
                if result['status'] == 'sent':
                    logger.info(f"✅ Email sent successfully via Gmail API to {to}")
                    return result
            elif self.active_service == 'sendgrid':
                result = await self._send_email_sendgrid(to, subject, content, content_type)
                if result['status'] == 'sent':
                    logger.info(f"✅ Email sent successfully via SendGrid to {to}")
                    return result
        except Exception as e:
            logger.warning(f"⚠️ Primary service {self.active_service} failed: {str(e)}")

        # Try fallback services
        return await self._try_fallback_services(to, subject, content, content_type)

    async def _try_fallback_services(self, to: str, subject: str, content: str, content_type: str) -> Dict[str, Any]:
        """Try fallback email services"""
        services = ['smtp', 'gmail_api', 'sendgrid']
        services.remove(self.active_service)  # Remove already tried service

        for service in services:
            try:
                logger.info(f"🔄 Trying fallback service: {service}")

                if service == 'smtp' and self.smtp_username and self.smtp_password:
                    result = await self._send_email_smtp(to, subject, content, content_type)
                elif service == 'gmail_api' and self.use_gmail_api:
                    result = await self._send_email_gmail_api(to, subject, content, content_type)
                elif service == 'sendgrid' and self.use_sendgrid:
                    result = await self._send_email_sendgrid(to, subject, content, content_type)
                else:
                    continue

                if result['status'] == 'sent':
                    logger.info(f"✅ Email sent successfully via fallback {service} to {to}")
                    return result

            except Exception as e:
                logger.warning(f"⚠️ Fallback service {service} failed: {str(e)}")
                continue

        # All services failed
        error_msg = f"All email services failed for {to}"
        logger.error(f"❌ {error_msg}")
        return {
            "status": "failed",
            "provider": "all_failed",
            "error": error_msg,
            "to": to
        }
    
    async def send_bulk_email(self, recipients: List[str], subject: str, content: str, content_type: str = "text/html") -> List[Dict[str, Any]]:
        """Send bulk emails"""
        try:
            if self.use_gmail_api:
                return await self._send_bulk_email_gmail_api(recipients, subject, content, content_type)
            elif self.use_sendgrid:
                return await self._send_bulk_email_sendgrid(recipients, subject, content, content_type)
            else:
                return await self._send_bulk_email_smtp(recipients, subject, content, content_type)
        except Exception as e:
            logger.error(f"Failed to send bulk email: {str(e)}")
            raise e

    async def _send_email_gmail_api(self, to: str, subject: str, content: str, content_type: str) -> Dict[str, Any]:
        """Send email using Gmail API"""
        try:
            # Create the email message
            message = self._create_gmail_message(to, subject, content, content_type)

            # Send email in thread pool
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmail_service.users().messages().send(
                        userId='me', body=message
                    ).execute()
                )

            return {
                "status": "sent",
                "provider": "gmail_api",
                "message_id": result.get('id'),
                "to": to
            }
        except Exception as e:
            logger.error(f"Gmail API error: {str(e)}")
            return {
                "status": "failed",
                "provider": "gmail_api",
                "error": str(e),
                "to": to
            }

    async def _send_bulk_email_gmail_api(self, recipients: List[str], subject: str, content: str, content_type: str) -> List[Dict[str, Any]]:
        """Send bulk email using Gmail API"""
        results = []

        # Send emails concurrently but limit concurrency
        semaphore = asyncio.Semaphore(5)  # Limit to 5 concurrent emails

        async def send_single(recipient):
            async with semaphore:
                return await self._send_email_gmail_api(recipient, subject, content, content_type)

        tasks = [send_single(recipient) for recipient in recipients]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to error results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "status": "failed",
                    "provider": "gmail_api",
                    "error": str(result),
                    "to": recipients[i]
                })
            else:
                processed_results.append(result)

        return processed_results

    def _create_gmail_message(self, to: str, subject: str, content: str, content_type: str) -> Dict[str, Any]:
        """Create a Gmail API message"""
        # Create the email message
        if content_type == "text/html":
            msg = MIMEMultipart('alternative')
            msg.attach(MIMEText(content, 'html'))
        else:
            msg = MIMEText(content, 'plain')

        msg['To'] = to
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['Subject'] = subject

        # Encode the message
        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')

        return {'raw': raw_message}

    async def _send_email_sendgrid(self, to: str, subject: str, content: str, content_type: str) -> Dict[str, Any]:
        """Send email using SendGrid"""
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to,
                subject=subject,
                html_content=content if content_type == "text/html" else None,
                plain_text_content=content if content_type == "text/plain" else None
            )
            
            # Send email in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(
                    executor, 
                    lambda: self.sg.send(message)
                )
            
            return {
                "status": "sent",
                "provider": "sendgrid",
                "status_code": response.status_code,
                "to": to
            }
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return {
                "status": "failed",
                "provider": "sendgrid",
                "error": str(e),
                "to": to
            }
    
    async def _send_bulk_email_sendgrid(self, recipients: List[str], subject: str, content: str, content_type: str) -> List[Dict[str, Any]]:
        """Send bulk email using SendGrid"""
        try:
            # Convert recipients to To objects
            to_list = [To(email) for email in recipients]
            
            message = Mail(
                from_email=self.from_email,
                to_emails=to_list,
                subject=subject,
                html_content=content if content_type == "text/html" else None,
                plain_text_content=content if content_type == "text/plain" else None
            )
            
            # Send email in thread pool
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(
                    executor, 
                    lambda: self.sg.send(message)
                )
            
            return [{
                "status": "sent",
                "provider": "sendgrid",
                "status_code": response.status_code,
                "recipients_count": len(recipients)
            }]
        except Exception as e:
            logger.error(f"SendGrid bulk email error: {str(e)}")
            return [{
                "status": "failed",
                "provider": "sendgrid",
                "error": str(e),
                "recipients_count": len(recipients)
            }]
    
    async def _send_email_smtp(self, to: str, subject: str, content: str, content_type: str) -> Dict[str, Any]:
        """Send email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to
            
            # Add content
            if content_type == "text/html":
                msg.attach(MIMEText(content, 'html'))
            else:
                msg.attach(MIMEText(content, 'plain'))
            
            # Send email in thread pool
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                await loop.run_in_executor(
                    executor, 
                    self._send_smtp_message, 
                    msg
                )
            
            return {
                "status": "sent",
                "provider": "smtp",
                "to": to
            }
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            return {
                "status": "failed",
                "provider": "smtp",
                "error": str(e),
                "to": to
            }
    
    async def _send_bulk_email_smtp(self, recipients: List[str], subject: str, content: str, content_type: str) -> List[Dict[str, Any]]:
        """Send bulk email using SMTP"""
        results = []
        
        # Send emails concurrently but limit concurrency
        semaphore = asyncio.Semaphore(5)  # Limit to 5 concurrent emails
        
        async def send_single(recipient):
            async with semaphore:
                return await self._send_email_smtp(recipient, subject, content, content_type)
        
        tasks = [send_single(recipient) for recipient in recipients]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "status": "failed",
                    "provider": "smtp",
                    "error": str(result),
                    "to": recipients[i]
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    def _send_smtp_message(self, msg: MIMEMultipart):
        """Send SMTP message (blocking operation)"""
        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
    
    def get_email_templates(self) -> Dict[str, Dict[str, str]]:
        """Get available email templates"""
        return {
            "welcome": {
                "subject": "🎉 Welcome to HackHub - Let's Build Something Amazing!",
                "content": self._get_welcome_template()
            },
            "registration_confirmation": {
                "subject": "✅ Registration Confirmed - {hackathon_title}",
                "content": self._get_registration_template()
            },
            "hackathon_reminder": {
                "subject": "⏰ Reminder: {hackathon_title} starts soon!",
                "content": self._get_reminder_template()
            },
            "hackathon_update": {
                "subject": "📢 Important Update: {hackathon_title}",
                "content": self._get_update_template()
            }
        }

    def _get_welcome_template(self) -> str:
        """Get welcome email template"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to HackHub</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎯 Welcome to HackHub!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your gateway to amazing hackathons</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 20px;">
                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">Hello {user_name}! 👋</h2>

                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Thank you for joining HackHub! We're excited to have you as part of our community of innovators, creators, and problem-solvers.
                    </p>

                    <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 18px;">🚀 What's Next?</h3>
                        <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Explore upcoming hackathons</li>
                            <li style="margin-bottom: 8px;">Register for events that interest you</li>
                            <li style="margin-bottom: 8px;">Connect with fellow developers</li>
                            <li>Build amazing projects and win prizes!</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            🎯 Go to Dashboard
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; margin: 0; font-size: 14px;">
                        Happy Hacking! 💻<br>
                        The HackHub Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_registration_template(self) -> str:
        """Get registration confirmation email template"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Registration Confirmed!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You're all set for the hackathon</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 20px;">
                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">Hey {user_name}! 🎉</h2>

                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Congratulations! Your registration for <strong>{hackathon_title}</strong> has been confirmed. Get ready for an amazing experience!
                    </p>

                    <!-- Event Details -->
                    <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">📅 Event Details</h3>
                        <div style="color: #4a5568;">
                            <p style="margin: 8px 0;"><strong>📍 Venue:</strong> {venue_name}</p>
                            <p style="margin: 8px 0;"><strong>🗓️ Start Date:</strong> {start_date}</p>
                            <p style="margin: 8px 0;"><strong>🏁 End Date:</strong> {end_date}</p>
                            <p style="margin: 8px 0;"><strong>⏰ Registration Deadline:</strong> {registration_deadline}</p>
                        </div>
                    </div>

                    <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #c53030; margin: 0 0 10px 0; font-size: 18px;">🎯 What to Bring</h3>
                        <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Your laptop and charger</li>
                            <li style="margin-bottom: 8px;">Creative ideas and enthusiasm</li>
                            <li style="margin-bottom: 8px;">Snacks and drinks (if not provided)</li>
                            <li>A positive attitude and team spirit!</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/hackathons/{hackathon_id}" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            📋 View Details
                        </a>
                        <a href="http://localhost:3000/calendar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            📅 Add to Calendar
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; margin: 0; font-size: 14px;">
                        See you at the hackathon! 🚀<br>
                        The HackHub Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_reminder_template(self) -> str:
        """Get hackathon reminder email template"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hackathon Reminder</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⏰ Hackathon Reminder</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Don't miss out on the action!</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 20px;">
                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">Hey {user_name}! 🚨</h2>

                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Just a friendly reminder that <strong>{hackathon_title}</strong> is starting soon! Make sure you're ready to hack.
                    </p>

                    <div style="background-color: #fffaf0; border-left: 4px solid #ed8936; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #c05621; margin: 0 0 10px 0; font-size: 18px;">🎯 Final Checklist</h3>
                        <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">✅ Laptop charged and ready</li>
                            <li style="margin-bottom: 8px;">✅ Development environment set up</li>
                            <li style="margin-bottom: 8px;">✅ Ideas brainstormed</li>
                            <li>✅ Team formed (if applicable)</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/hackathons/{hackathon_id}" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            🎯 View Hackathon
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; margin: 0; font-size: 14px;">
                        Let's build something amazing! 💻<br>
                        The HackHub Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_update_template(self) -> str:
        """Get hackathon update email template"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hackathon Update</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📢 Important Update</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Information about your hackathon</p>
                </div>

                <!-- Content -->
                <div style="padding: 40px 20px;">
                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">Hello {user_name}! 📋</h2>

                    <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        We have an important update regarding <strong>{hackathon_title}</strong>:
                    </p>

                    <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <div style="color: #4a5568; line-height: 1.6;">
                            {custom_message}
                        </div>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/hackathons/{hackathon_id}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            📋 View Details
                        </a>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; margin: 0; font-size: 14px;">
                        Stay updated! 📱<br>
                        The HackHub Team
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    async def send_registration_confirmation_email(self, user_email: str, user_name: str, hackathon_data: dict) -> Dict[str, Any]:
        """Send registration confirmation email"""
        try:
            template = self._get_registration_template()

            # Format the template with hackathon data
            content = template.format(
                user_name=user_name,
                hackathon_title=hackathon_data.get('title', 'Hackathon'),
                hackathon_id=hackathon_data.get('id', ''),
                venue_name=hackathon_data.get('venue_name', 'TBD'),
                start_date=hackathon_data.get('start_date', 'TBD'),
                end_date=hackathon_data.get('end_date', 'TBD'),
                registration_deadline=hackathon_data.get('registration_deadline', 'TBD')
            )

            subject = f"✅ Registration Confirmed - {hackathon_data.get('title', 'Hackathon')}"

            return await self.send_email(user_email, subject, content, "text/html")

        except Exception as e:
            logger.error(f"Failed to send registration confirmation email: {str(e)}")
            raise e

    async def send_welcome_email(self, user_email: str, user_name: str) -> Dict[str, Any]:
        """Send welcome email to new users"""
        try:
            template = self._get_welcome_template()
            content = template.format(user_name=user_name)
            subject = "🎉 Welcome to HackHub - Let's Build Something Amazing!"

            return await self.send_email(user_email, subject, content, "text/html")

        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")
            raise e
