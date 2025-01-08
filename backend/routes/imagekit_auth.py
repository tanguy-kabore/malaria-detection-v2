from flask import jsonify
import time
import hashlib
import hmac
import base64
import os
from dotenv import load_dotenv

load_dotenv()

def setup_imagekit_routes(app):
    @app.route('/auth/imagekit', methods=['GET'])
    def get_imagekit_auth():
        try:
            # ImageKit credentials
            private_key=os.getenv('IMAGEKIT_PRIVATE_KEY')
            public_key=os.getenv('IMAGEKIT_PUBLIC_KEY')
            url_endpoint=os.getenv('IMAGEKIT_URL_ENDPOINT')

            # Generate token
            token = {
                'token': '',
                'expire': int(time.time()) + 3600,  # Token expires in 1 hour
                'publicKey': public_key
            }

            # Generate signature
            message = str(token['expire']).encode('utf-8')
            signature = hmac.new(
                private_key.encode('utf-8'),
                message,
                hashlib.sha1
            ).digest()

            # Add signature to token
            token['signature'] = base64.b64encode(signature).decode('utf-8')

            return jsonify(token)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
