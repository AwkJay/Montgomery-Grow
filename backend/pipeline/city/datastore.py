import pandas as pd
from database import get_db

class DataStore:

    def __init__(self):

        conn = get_db()

        self.business_licenses = pd.read_sql("SELECT * FROM business_licenses", conn)
        self.construction_permits = pd.read_sql("SELECT * FROM construction_permits", conn)
        self.complaints = pd.read_sql("SELECT * FROM service_requests_311", conn)

        conn.close()