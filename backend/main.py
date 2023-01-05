from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from tensorflow import keras
import pickle
import joblib
import pandas as pd
import numpy as np
from . import utils
import random

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=origins,
    allow_headers=origins,
)

crime_model = keras.models.load_model('backend/model.h5')
pd_cd_model = pickle.load(open('backend/PD_CD_predict.h5', 'rb'))

min_max_dict = pickle.load(open('backend/pickles/dict_min_max.pickle', 'rb'))
vic_sex_dict = pickle.load(open('backend/pickles/VIC_SEX_dict.pickle', 'rb'))
vic_race_dict = pickle.load(open('backend/pickles/VIC_RACE_dict.pickle', 'rb'))
vic_age_group_dict = pickle.load(
    open('backend/pickles/VIC_AGE_GROUP_dict.pickle', 'rb'))
patrol_dict = pickle.load(open('backend/pickles/patrol_dict.pickle', 'rb'))
boro_nm_dict = pickle.load(open('backend/pickles/BORO_NM_dict.pickle', 'rb'))

target_dict = pickle.load(open('backend/pickles/Target_dict.pickle', 'rb'))
crimes = dict()

for key, value in target_dict.items():
    crimes[value] = key


@app.get('/predict_crime')
def predict_crime(age: int,sex: str, race: str, datetime: float, lat: float, long: float,
                borough: str, patrol_borough: str, precinct: float
                ):
    if not (age and sex and race and datetime and lat and long and borough and patrol_borough and precinct):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Missing parameters")
    
    age_category = utils.get_age_category(age)
    [PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2,
        PATROL_BORO_3] = patrol_dict[patrol_borough]
    [BORO_NM0, BORO_NM1, BORO_NM2] = boro_nm_dict[borough]
    [VIC_SEX_0, VIC_SEX_1, VIC_SEX_2] = vic_sex_dict[sex]
    [VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3] = vic_race_dict[race]
    [VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2] = vic_age_group_dict[age_category]
    ADDR_PCT_CD = utils.normalize("ADDR_PCT_CD", precinct, min_max_dict)
    DATETIME = utils.normalize("DateTime", datetime, min_max_dict)
    LATITUDE = utils.normalize("Latitude", lat, min_max_dict)
    LONGITUDE = utils.normalize("Longitude", long, min_max_dict)

    observation = pd.DataFrame([PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2, PATROL_BORO_3,
                                BORO_NM0, BORO_NM1, BORO_NM2, VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2,
                                VIC_SEX_0, VIC_SEX_1, VIC_SEX_2, VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3,
                                ADDR_PCT_CD, LATITUDE, LONGITUDE, DATETIME])

    observation = pd.DataFrame(np.reshape(np.array(observation), (observation.shape[0], 1)))
    observation = observation.transpose()

    PD_CD = pd_cd_model.predict(observation)[0][0]
    PD_CD = random.random()

    observation = pd.DataFrame([PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2, PATROL_BORO_3,
                                BORO_NM0, BORO_NM1, BORO_NM2, VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2,
                                VIC_SEX_0, VIC_SEX_1, VIC_SEX_2, VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3,
                                PD_CD, ADDR_PCT_CD, LATITUDE, LONGITUDE, DATETIME])
    observation = pd.DataFrame(np.reshape(np.array(observation), (observation.shape[0], 1)))
    observation = observation.transpose()

    crime = np.argmax(crime_model.predict(observation)[0])

    crime = crimes[crime]

    return {"prediction": crime}
