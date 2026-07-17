import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.neighbors import KNeighborsClassifier 
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split 
from sklearn.metrics import accuracy_score
import joblib


df=pd.read_csv('features.csv')

features=['chroma_stft','spectral_centroid','spectral_bandwidth','spectral_rolloff','rms','zero_crossing_rate']

y=df['target']
print(y)

X=df[features]
print(X)
#scaled_df = StandardScaler().fit_transform(df)

X_train, X_test, y_train, y_test = train_test_split( 
             X, y, test_size = 0.2, random_state=42) 


neighbors = np.arange(1, 15) 
train_accuracy = np.empty(len(neighbors)) 
test_accuracy = np.empty(len(neighbors)) 
  
# Loop over K values 
for i, k in enumerate(neighbors): 
    knn = KNeighborsClassifier(n_neighbors=k) 
    knn.fit(X_train, y_train) 
      
    # Compute training and test data accuracy 
    train_accuracy[i] = knn.score(X_train, y_train) 
    test_accuracy[i] = knn.score(X_test, y_test) 
  
# Generate plot 
plt.plot(neighbors, test_accuracy, label = 'Testing dataset Accuracy') 
plt.plot(neighbors, train_accuracy, label = 'Training dataset Accuracy') 
  
plt.legend() 
plt.xlabel('n_neighbors') 
plt.ylabel('Accuracy') 
plt.show() 


knn = KNeighborsClassifier(n_neighbors=2) 
knn.fit(X_train, y_train) 

y_pred = knn.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print("Accuracy:", accuracy)


# Define the file path
model_file = "model_utils/model.pkl"

# Save the model to the file
joblib.dump(knn, model_file)
print("Model saved successfully to", model_file)