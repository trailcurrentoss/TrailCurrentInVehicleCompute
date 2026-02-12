#!/usr/bin/env python3
"""
Query MongoDB for enabled MCU modules
Used by deploy.sh to determine which devices need firmware updates
"""

from pymongo import MongoClient
import json
import os
from dotenv import load_dotenv

# Load .env file from local_code directory (same directory as this script)
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Get MongoDB connection details from .env
MONGODB_HOST = os.getenv('MONGODB_HOST', 'localhost')
MONGODB_PORT = int(os.getenv('MONGODB_PORT', '27017'))
MONGODB_DB = os.getenv('MONGODB_DATABASE', 'trailcurrent')

# Connect to MongoDB
mongo_uri = f'mongodb://{MONGODB_HOST}:{MONGODB_PORT}/'
client = MongoClient(mongo_uri)
db = client[MONGODB_DB]

# Get system_config document
config = db.system_config.find_one({'_id': 'main'})
if not config or 'mcu_modules' not in config:
    print('[]')
    exit(0)

# Filter enabled modules
enabled_modules = [
    {
        'hostname': m['hostname'],
        'type': m['type'],
        'name': m['name']
    }
    for m in config['mcu_modules']
    if m.get('enabled', False)
]

print(json.dumps(enabled_modules))
