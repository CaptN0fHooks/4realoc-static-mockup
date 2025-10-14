#!/bin/bash
echo "Starting local development server..."
echo ""
echo "This will serve your website on http://localhost:8080"
echo "This should resolve CORS issues with the Repliers API"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8080


