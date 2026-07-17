import tkinter as tk
from tkinter import ttk
import sounddevice as sd
import soundfile as sf
import threading
import time
import joblib
from feature_extractor import FeatureExtractor
from sklearn.preprocessing import StandardScaler
import librosa
import numpy as np
import pandas as pd
import os

def displayNotification(message,title=None,subtitle=None,soundname=None):
    """
        Display an OSX notification with message title an subtitle
        sounds are located in /System/Library/Sounds or ~/Library/Sounds
    """
    titlePart = ''
    if(not title is None):
        titlePart = 'with title "{0}"'.format(title)
    subtitlePart = ''
    if(not subtitle is None):
        subtitlePart = 'subtitle "{0}"'.format(subtitle)
    soundnamePart = ''
    if(not soundname is None):
        soundnamePart = 'sound name "{0}"'.format(soundname)

    appleScriptNotification = 'display notification "{0}" {1} {2} {3}'.format(message,titlePart,subtitlePart,soundnamePart)
    os.system("osascript -e '{0}'".format(appleScriptNotification))




class AudioRecorderApp:
    def __init__(self, master):
        self.master = master
        master.title("Auto Audio Recorder & Classifier")
        master.geometry("400x300")  # Set window size

        style = ttk.Style()
        style.configure('TButton', font=('calibri', 10, 'bold'), foreground='black')

        self.record_button = ttk.Button(master, text="Start Recording", command=self.start_recording)
        self.record_button.pack(pady=10)

        self.progress_bar = ttk.Progressbar(master, orient=tk.HORIZONTAL, length=200, mode='determinate')
        self.progress_bar.pack(pady=5)

        self.finished_label = ttk.Label(master, text="", font=('calibri', 10, 'italic'))
        self.finished_label.pack(pady=5)

        self.stop_button = ttk.Button(master, text="Stop Recording", command=self.stop_recording, state=tk.DISABLED)
        self.stop_button.pack(pady=10)

        self.recording = False  # Flag to control recording state

    def start_recording(self):
        self.recording = True
        self.record_button.config(state=tk.DISABLED)  # Disable start button
        self.stop_button.config(state=tk.NORMAL)  # Enable stop button
        self.finished_label.config(text="")  # Reset finished label
        threading.Thread(target=self._start_recording).start()

    def stop_recording(self):
        self.recording = False
        self.record_button.config(state=tk.NORMAL)  # Enable start button
        self.stop_button.config(state=tk.DISABLED)  # Disable stop button

    def _start_recording(self):
        duration = 5  # Recording duration in seconds
        sample_rate = 44100  # Sample rate
        channels = 1  # Number of audio channels

        while self.recording:
            # Start recording
            recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=channels, dtype='int16')
            self.update_progress(0, duration)  # Start updating progress bar

            sd.wait()  # Wait for recording to complete

            # Save recording to a .wav file
            file_path = "app_utils/recording.wav"
            sf.write(file_path, recording, sample_rate)
            self.record_button.config(state=tk.NORMAL)  # Enable the button after recording
            result = self.process_audio()
            self.finished_label.config(text=result)
            print("Recording saved as:", file_path)
            # Allow for a short pause before next recording if still in recording mode
            if self.recording:
                time.sleep(1)

        # Reset recording state after user stops
        self.finished_label.config(text="Recording stopped.")

    def update_progress(self, current_time, total_time):
        if current_time < total_time:
            self.progress_bar['value'] = (current_time / total_time) * 100
            current_time += 1
            self.master.after(1000, self.update_progress, current_time, total_time)

    def process_audio(self):
        # Define file paths (assuming these paths are set up correctly)
        model_file = "model_utils/model.pkl"
        file = "app_utils/recording.wav"

        # Loading feature extractor
        feature_extractor = FeatureExtractor()

        # Load the model from the file
        loaded_model = joblib.load(model_file)

        # Save recording to a .wav file
          # Assuming correct file path
       

        # Now you can use the loaded model for predictions
        y, sr = librosa.load(file,sr=None)
        new_sample=feature_extractor.get_feature_vector(y,sr) 
        df = pd.DataFrame(columns=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','mfcc','rms','zero_crossing_rate','target'])
        new_sample +=['test_sample']
        df.loc[len(df)] = new_sample
        df.to_csv('model_utils/test_features.csv', index=False)
        
        features=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','mfcc','rms','zero_crossing_rate']
        feature_vector=df[features]
        scaler = StandardScaler()
        feature_vector_scaled = scaler.fit_transform(feature_vector)
        predicted_class = loaded_model.predict(feature_vector_scaled)

    
        predicted_class = loaded_model.predict(feature_vector)
        result =f"Predicted class: {predicted_class}"
        if predicted_class[0]=="not_ok":
            displayNotification('Alert')
       
        return result

        # Convert to NumPy array and reshape for prediction (if your model expects 2D input)

def main():
    root = tk.Tk()
    app = AudioRecorderApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()

