import tkinter as tk
from tkinter import ttk
import sounddevice as sd
import soundfile as sf
import threading
import time
import joblib
from feature_extractor import FeatureExtractor
import librosa
import numpy as np
import pandas as pd

class AudioRecorderApp:
    def __init__(self, master):
        self.master = master
        master.title("Audio Recorder")
        master.geometry("300x250")  # Set window size

        style = ttk.Style()
        style.configure('TButton', font=('calibri', 10, 'bold'), foreground='black')

        self.record_button = ttk.Button(master, text="Record", command=self.record_audio)
        self.record_button.pack(pady=10)

        self.progress_bar = ttk.Progressbar(master, orient=tk.HORIZONTAL, length=200, mode='determinate')
        self.progress_bar.pack(pady=5)

        self.finished_label = ttk.Label(master, text="", font=('calibri', 10, 'italic'))
        self.finished_label.pack(pady=5)

        self.result_button = ttk.Button(master, text="Get Result", command=self.show_result)
        self.result_button.pack(pady=10)

    def record_audio(self):
        self.record_button.config(state=tk.DISABLED)  # Disable button during recording
        self.finished_label.config(text="")  # Reset finished label
        # Start a new thread to handle recording
        threading.Thread(target=self._start_recording).start()

    def _start_recording(self):
        duration = 5  # Recording duration in seconds
        sample_rate = 44100  # Sample rate
        channels = 1  # Number of audio channels

        # Start recording
        recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=channels, dtype='int16')
        self.update_progress(0, duration)  # Start updating progress bar

        sd.wait()  # Wait for recording to complete

        # Save recording to a .wav file
        file_path = "app_utils/recording.wav"
        sf.write(file_path, recording, sample_rate)

        self.record_button.config(state=tk.NORMAL)  # Enable the button after recording
        self.finished_label.config(text="Finished recording")
        print("Recording saved as:", file_path)

    def update_progress(self, current_time, total_time):
        if current_time < total_time:
            self.progress_bar['value'] = (current_time / total_time) * 100
            current_time += 1
            self.master.after(1000, self.update_progress, current_time, total_time)

    def get_result(self):
        
        # Define the file path
        model_file = "model_utils/model.pkl"
        file="app_utils/recording.wav"
        
        #Loading feature extractor
        feature_extractor=FeatureExtractor()
        
        # Load the model from the file
        loaded_model = joblib.load(model_file)

        # Now you can use the loaded model for predictions
        # For example, let's predict the class of a new sample
        y, sr = librosa.load(file,sr=None)
        new_sample=feature_extractor.get_feature_vector(y,sr) 
        df = pd.DataFrame(columns=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','rms','zero_crossing_rate','target'])
        new_sample +=['test_sample']
        df.loc[len(df)] = new_sample
        df.to_csv('model_utils/test_features.csv', index=False)
        
        features=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','rms','zero_crossing_rate']
        feature_vector=df[features]
        
        
        predicted_class = loaded_model.predict(feature_vector)
        result =f"Predicted class: {predicted_class}"
        
        return result

    def show_result(self):
        result = self.get_result()
        self.finished_label.config(text=result)

def main():
    root = tk.Tk()
    app = AudioRecorderApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()


