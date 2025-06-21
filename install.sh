#!/bin/bash

echo "========================================"
echo "HackHub Installation Script"
echo "========================================"
echo

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error installing root dependencies"
    exit 1
fi

echo
echo "Installing client dependencies..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "Error installing client dependencies"
    exit 1
fi

echo
echo "Installing server dependencies..."
cd ../server
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing server dependencies"
    exit 1
fi

cd ..
echo
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo
echo "Next steps:"
echo "1. Download Firebase Admin SDK key and save as 'firebase-admin-sdk.json'"
echo "2. Run 'npm run dev' to start both servers"
echo "3. Open http://localhost:3000 in your browser"
echo
echo "See setup.md for detailed instructions"
echo
