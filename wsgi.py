import os
import sys

# Ensure the app can find its modules
sys.path.insert(0, os.path.dirname(__file__))

from app import app

if __name__ == "__main__":
    app.run()
