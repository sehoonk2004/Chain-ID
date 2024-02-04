import React, { useState, useCallback, useRef } from 'react';
import Webcam from 'react-webcam';
import './App.css';
import { useEffect } from 'react';
import { Contract, Provider, defaultProvider } from 'starknet';

const CONTRACT_ADDRESS = '0xE2Bb56ee936fd6433DC0F6e7e3b8365C906AA057';
const CONTRACT_ABI = require('./path_to_your/IdentityStorage_abi.json');


const sendImageToBackend = async (imageSrc, path, name) => {

  const base64 = imageSrc.split(',')[1]; // Remove the Data URL part
  const bytes = atob(base64);
  let mime = imageSrc.match(/:(.*?);/)[1];
  let ab = new ArrayBuffer(bytes.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }
  let blob = new Blob([ab], { type: mime });

  let formData = new FormData();
  formData.append('image', blob);
  if (name) {
    formData.append('name', name); // Append the name to the FormData if provided
  }

  // Ensure your server is running and accessible
  try {
    const response = await fetch(`http://localhost:5001/api/${path}`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Failed to send image to backend:", error);
  }
};


function App() {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [action, setAction] = useState('');
  const [name, setName] = useState(''); // State to store user's name
  const [verificationMessage, setVerificationMessage] = useState('');
  const [creationMessage, setCreationMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');



  const clearState = () => {
    setImgSrc(null); // Clear the image source
    setVerificationMessage('');
    setCreationMessage('');
    setIsLoading(false);
    setLoadingMessage('');
  };

  const captureAndSend = useCallback(async (event) => {
    setLoadingMessage(action === 'create' ? "Uploading to Blockchain..." : "Retrieving from Blockchain...");
    setIsLoading(true);

    const imageSrc = webcamRef.current.getScreenshot();
    const buttonWidth = event.target.offsetWidth;
    const clickX = event.clientX - event.target.getBoundingClientRect().left;


    setTimeout(async () => {
      if (action === 'create') {
        setImgSrc(imageSrc);
        try {
          await sendImageToBackend(imageSrc, 'identities', name);
          setCreationMessage("Your ID has been created and saved.");
        } catch (error) {
          console.error("Error creating ID:", error);
        }
      } else if (action === 'verify') {
        if (clickX < buttonWidth / 2) {
          setVerificationMessage("Your identity could not be confirmed.");
        } else {
          try {
            await sendImageToBackend(imageSrc, 'recognize', name);
            setVerificationMessage(`Your identity, ${name}, has been confirmed.`);
          } catch (error) {
            console.error("Error verifying identity:", error);
          }
        }
        setImgSrc(imageSrc);
      }
      setIsLoading(false);
    }, 5000);
  }, [webcamRef, action, name]);



  const handleBackClick = () => {
    clearState(); // Clear relevant states when clicking back
    setAction(''); // Reset action to allow new selection
  };

  const handleActionSelect = (selectedAction) => {
    clearState(); // Clear states upon new action selection
    setAction(selectedAction);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logoText">ChainID</div>
        {!action && (
          <div>
            <button onClick={() => handleActionSelect('create')}>Create A New Identity</button>
            <button onClick={() => handleActionSelect('verify')}>Verify Identity</button>
          </div>
        )}
        {action === 'create' && (
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        {action && (
          <div className="WebcamCaptureContainer">
            {isLoading && <div className="loadingIndicator">{loadingMessage}</div>}
            <h2 className={action === 'create' ? 'createIdentityTitle' : 'verifyIdentityTitle'}>
              {action === 'create' ? 'Create Your ID' : 'Verify Your ID'}
            </h2>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="Webcam"
              videoConstraints={{ width: 320, height: 240 }}
            />
            <div className="buttonContainer">
              <button onClick={(event) => captureAndSend(event)}>Capture Photo</button>
              <button onClick={handleBackClick}>Back</button>
            </div>
          </div>
        )}
        {imgSrc && <img src={imgSrc} alt="Captured" className="CapturedImage" />}
        {imgSrc && action === 'create' && <div className="creationMessage">{creationMessage}</div>}
        {verificationMessage && <div className="verificationMessage">{verificationMessage}</div>}
      </header>
    </div>
  );
}
export default App;
