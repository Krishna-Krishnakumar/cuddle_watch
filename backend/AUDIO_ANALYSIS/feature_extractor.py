from glob import glob
import librosa
from librosa import feature
import numpy as np
import pandas as pd
import os

class FeatureExtractor:
    
    def __init__(self):
        self.fn_list_i = [
            feature.chroma_stft,
            feature.spectral_centroid,
            feature.spectral_bandwidth,
            feature.spectral_rolloff
        ]
        
        self.fn_list_ii = [
            feature.rms,
            feature.zero_crossing_rate
        ]

    def get_feature_vector(self,y,sr):  
        feat_vect_i = [ np.mean(funct(y=y,sr=sr)) for funct in self.fn_list_i]
        feat_vect_ii = [ np.mean(funct(y=y)) for funct in self.fn_list_ii]
        feature_vector =   feat_vect_i + feat_vect_ii  
        return feature_vector






if __name__ == "__main__":

    #declaring feature extractor class
    feature_extractor=FeatureExtractor()
    
    #defining featuire storage in DF
    df = pd.DataFrame(columns=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','rms','zero_crossing_rate','target'])

    #directories of normal audios
    root ='data/'
    folders=os.listdir(root)
    for folder in folders:
        norm_audio_files = glob(root+ folder+ '/*.wav')
        #Getting Features
        norm_audios_feat = []
        for file in norm_audio_files:
            print(file)
            y, sr = librosa.load(file,sr=None)
            feat_vec=feature_extractor.get_feature_vector(y,sr)
            feat_vec +=[str(folder)]
            df.loc[len(df)] = feat_vec
            
    df.to_csv('features.csv', index=False)
