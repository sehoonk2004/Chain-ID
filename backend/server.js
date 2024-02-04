const express = require('express');
const fs = require('fs');
const path = require('path');
const canvas = require('canvas');
const faceapi = require('face-api.js');
const mongoose = require('mongoose');
const multer = require('multer'); // Import Multer
const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const port = 5001;
const cors = require('cors');

app.use(cors()); // This enables CORS for all routes and origins

// Continue with the rest of your middleware and routes setup

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.use(express.json({ limit: '50mb' }));

mongoose.connect('mongodb://localhost/facial_recognition', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...', err));

const identitySchema = new mongoose.Schema({
    name: String,
    faceDescriptors: [[Number]], // An array of arrays to store face descriptor vectors
});

const Identity = mongoose.model('Identity', identitySchema);

async function loadModels() {
    const MODEL_PATH = path.join(__dirname, 'models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_PATH);
    console.log('Models loaded successfully');
}

loadModels().catch(console.error);

app.post('/api/recognize', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: "No image file provided." });
    }

    const imageBuffer = fs.readFileSync(req.file.path);

    try {
        const img = await canvas.loadImage(imageBuffer);
        const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        if (detections.length > 0) {
            const matches = await Promise.all(detections.map(det => findBestMatch(det.descriptor)));
            const validMatches = matches.filter(match => match !== null);
            if (validMatches.length > 0) {
                res.json({ matches: validMatches });
            } else {
                res.status(404).send({ message: "No matching faces found." });
            }
        } else {
            res.status(404).send({ message: "No faces detected in the image." });
        }
    } catch (error) {
        console.error("Error processing the image:", error);
        res.status(500).send({ message: "Error processing the image" });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

app.post('/api/identities', upload.single('image'), async (req, res) => {
    const name = req.body.name;
    if (!req.file || !name) {
        return res.status(400).send({ message: "Name and image file are required." });
    }

    const imageBuffer = fs.readFileSync(req.file.path);

    try {
        const img = await canvas.loadImage(imageBuffer);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
            throw new Error('No faces detected.');
        }

        await addIdentity(name, [detection.descriptor]);
        res.send({ message: 'Identity added successfully' });
    } catch (error) {
        console.error("Error adding identity:", error);
        res.status(500).send({ message: "Error adding identity" });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

// Implement addIdentity, getAllIdentities, euclideanDistance, and findBestMatch functions here

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

const cors = require('cors');

// Use it before any route
app.use(cors());

app.post('/api/recognize', async (req, res) => {
    try {
        // Your existing logic here...
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

// Ensure the URL is correct based on your server's address and port
const response = await fetch('http://localhost:5001/api/recognize', {
    method: 'POST',
    body: formData, // Assuming formData is correctly prepared
});
