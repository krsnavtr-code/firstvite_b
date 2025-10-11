import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Now we can use __dirname
const logoImagePath = path.join(__dirname, '../public/img-1753961989896-7541613.png');

// We'll use HTML directly for now instead of PDF generation
// import pdf from 'html-pdf';

// Function to generate ID card as a PDF
const generateIdCard = async (candidate, eventDetails = {}) => {
    const { name, email, phone, college, course, graduationYear } = candidate;

    const {
        eventName = 'Career Hiring Camp 2025',
        logoUrl = `file://${logoImagePath}`
    } = eventDetails;

    // Generate a unique ID number
    const registrationId = `FV${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Create HTML content for the ID card
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>FirstVITE - Event ID Card</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
            
            body {
                margin: 0;
                padding: 0;
                font-family: 'Poppins', Arial, sans-serif;
                background: #f5f7ff;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            
            .id-card {
                width: 320px;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                color: black;
                // color: white;
                position: relative;
            }
            
            .id-header {
                padding: 10px;
                text-align: center;
                background: linear-gradient(135deg, rgb(244, 124, 38) 0%, rgb(244, 124, 38) 100%);
                color: white;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .id-header h1 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            
            .id-header p {
                margin: 5px 0 0;
                font-size: 11px;
                opacity: 0.9;
            }
            
            .id-photo-container {
                display: flex;
                justify-content: center;
                padding: 10px 0;
            }
            
            .id-photo {
                width: 100px;
                height: 100px;
                margin: 10px auto;
                background: rgba(255, 255, 255, 0.9);
                border: 3px solid white;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .id-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .id-details {
                padding: 0 15px 15px;
            }
            
            .detail-row {
                margin-bottom: 12px;
                display: flex;
                align-items: center;
            }
            
            .detail-label {
                font-size: 12px;
                opacity: 0.8;
                width: 100px;
                flex-shrink: 0;
            }
            
            .detail-value {
                font-size: 12px;
                font-weight: 500;
                flex-grow: 1;
                word-break: break-word;
            }
            
            .event-info {
                text-align: right;
            }
            
            .event-info p {
                margin: 3px 0;
                font-size: 11px;
                opacity: 0.9;
            }
            
            .id-number {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(0, 0, 0, 0.3);
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 1px;
            }
            
            .logo {
                position: absolute;
                top: 15px;
                left: 20px;
                height: 30px;
            }
            
            .logo img {
                height: 100%;
                filter: brightness(0) invert(1);
            }
        </style>
    </head>
    <body>
        <div class="id-card">            
            <div class="id-header">
                <h1>FirstVITE E-Learning Pvt. Ltd.</h1>
                <h1 style="font-size: 13px;">${eventName}</h1>
                <p>Official Participant ID Card</p>
            </div>
            
            <div class="id-photo-container">
                <div class="id-photo">
                    ${candidate.profilePhoto ? 
                        `<img src="data:${candidate.profilePhoto.mimeType || 'image/jpeg'};base64,${candidate.profilePhoto.base64}" 
                              alt="Profile Photo" 
                              style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : 
                        `<div style="text-align: center; color: #4f46e5; font-size: 12px; display: flex; flex-direction: column; justify-content: center; height: 100%;">
                            <div style="font-size: 40px; margin-bottom: 5px; line-height: 1;">👤</div>
                            <div>No Photo</div>
                        </div>`
                    }
                </div>
            </div>
            
            <div class="id-details">
                <div class="detail-row">
                    <div class="detail-label">Registration ID:</div>
                    <div class="detail-value">${registrationId}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">${name}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${email}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${phone || 'N/A'}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Institution:</div>
                    <div class="detail-value">${college || 'N/A'}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Course:</div>
                    <div class="detail-value">${course || 'N/A'}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate HTML file path
    const htmlFilePath = path.join(tempDir, `idcard_${registrationId}.html`);

    // Write HTML to file
    fs.writeFileSync(htmlFilePath, htmlContent);

    // For now, return the HTML file path
    // In a production environment, you might want to use a proper PDF generation service
    return {
        html: htmlContent,
        filePath: htmlFilePath,
        registrationId,
        fileName: `FirstVITE_ID_${registrationId}.html`,
        isHTML: true
    };
};

export default generateIdCard;
