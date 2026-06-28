// EXIT 67 - Anomaly System Code
// This file handles procedural texture generation and visual modifications for the 67 anomalies.

const AnomalySystem = {
    activeId: 0,
    time: 0,
    
    drawWoodFloor() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const cols = 4;
        const plankWidth = 128;
        
        // Base wood color palette (high-quality oak/walnut look)
        const baseColors = [
            '#523624', // deep warm walnut
            '#5c3e2b',
            '#664632',
            '#704d38',
            '#4d311f'
        ];

        // Dark gap base
        ctx.fillStyle = '#1e110a';
        ctx.fillRect(0, 0, 512, 512);

        const columnSeams = [
            [0, 256, 512],
            [0, 128, 384, 512],
            [0, 64, 320, 512],
            [0, 192, 448, 512]
        ];

        function getPlankId(c, yStart) {
            if (c === 0) return yStart === 0 ? 0 : 1;
            if (c === 1) return yStart === 128 ? 2 : 3;
            if (c === 2) return yStart === 64 ? 4 : 5;
            return yStart === 192 ? 6 : 7;
        }

        for (let c = 0; c < cols; c++) {
            const xStart = c * plankWidth;
            const xEnd = xStart + plankWidth;
            const seams = columnSeams[c];

            for (let i = 0; i < seams.length - 1; i++) {
                const yStart = seams[i];
                const yEnd = seams[i+1];
                const plankId = getPlankId(c, yStart);
                
                // Seeded random for this plank
                let seed = (plankId * 153 + 77) % 1000;
                function plankRand() {
                    let x = Math.sin(seed++) * 10000;
                    return x - Math.floor(x);
                }

                // Choose color
                const colorIdx = Math.floor(plankRand() * baseColors.length);
                const baseColor = baseColors[colorIdx];
                
                ctx.fillStyle = baseColor;
                ctx.fillRect(xStart, yStart, plankWidth, yEnd - yStart);

                // Clip drawing to this plank
                ctx.save();
                ctx.beginPath();
                ctx.rect(xStart, yStart, plankWidth, yEnd - yStart);
                ctx.clip();

                // Draw wood grain
                const grainLines = 8;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                ctx.lineWidth = 1 + plankRand() * 1.5;
                
                for (let g = 0; g < grainLines; g++) {
                    ctx.beginPath();
                    const startX = xStart - 30 + plankRand() * (plankWidth + 60);
                    const waveAmp = 5 + plankRand() * 10;
                    const waveFreq = (1 + plankRand() * 2) * Math.PI / 256; // periodic over 512px height
                    const waveOffset = plankRand() * Math.PI * 2;
                    
                    ctx.beginPath();
                    for (let y = yStart; y <= yEnd; y += 4) {
                        const x = startX + Math.sin(y * waveFreq + waveOffset) * waveAmp;
                        if (y === yStart) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }

                // Draw wood knot
                if (plankRand() < 0.2) {
                    const knotX = xStart + 20 + plankRand() * (plankWidth - 40);
                    const knotY = yStart + 30 + plankRand() * (yEnd - yStart - 60);
                    
                    if (knotY > yStart && knotY < yEnd) {
                        const knotRad = 3 + plankRand() * 4;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                        ctx.beginPath();
                        ctx.arc(knotX, knotY, knotRad, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
                        ctx.lineWidth = 1;
                        for (let r = 1; r <= 3; r++) {
                            ctx.beginPath();
                            ctx.arc(knotX, knotY, knotRad + r * 5, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                }

                // High-quality shading/depth:
                // Subtle top/left light border (bevel highlight)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(xStart + 0.5, yEnd - 0.5);
                ctx.lineTo(xStart + 0.5, yStart + 0.5);
                ctx.lineTo(xEnd - 0.5, yStart + 0.5);
                ctx.stroke();

                // Subtle bottom/right shadow
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.beginPath();
                ctx.moveTo(xStart + 0.5, yEnd - 0.5);
                ctx.lineTo(xEnd - 0.5, yEnd - 0.5);
                ctx.lineTo(xEnd - 0.5, yStart + 0.5);
                ctx.stroke();

                ctx.restore();
            }
        }

        // Draw final dark seams between planks
        ctx.strokeStyle = 'rgba(10, 5, 2, 0.7)';
        ctx.lineWidth = 2.5;

        // Vertical lines
        for (let c = 1; c < cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * plankWidth, 0);
            ctx.lineTo(c * plankWidth, 512);
            ctx.stroke();
        }

        // Horizontal lines (staggered)
        for (let c = 0; c < cols; c++) {
            const xStart = c * plankWidth;
            const xEnd = xStart + plankWidth;
            const seams = columnSeams[c];
            
            for (let i = 1; i < seams.length - 1; i++) {
                ctx.beginPath();
                ctx.moveTo(xStart, seams[i]);
                ctx.lineTo(xEnd, seams[i]);
                ctx.stroke();
            }
        }

        // Ensure edges have nice dark lines for tiling boundary
        ctx.strokeStyle = 'rgba(10, 5, 2, 0.7)';
        ctx.strokeRect(0, 0, 512, 512);

        return canvas;
    },

    // Draw procedural textures
    drawArtGalleryPoster(inverted = false, isAlien = false, showCorridor = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Draw elegant gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, 768);
        grad.addColorStop(0, inverted ? '#e0f2fe' : '#0f172a');
        grad.addColorStop(1, inverted ? '#cbd5e1' : '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 768);

        // Abstract art painting
        ctx.fillStyle = inverted ? '#1e3a8a' : '#93c5fd';
        ctx.fillRect(100, 150, 312, 300);

        ctx.fillStyle = inverted ? '#ef4444' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(256, 300, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = inverted ? '#059669' : '#34d399';
        ctx.beginPath();
        ctx.moveTo(150, 450);
        ctx.lineTo(256, 250);
        ctx.lineTo(362, 450);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = inverted ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 16;
        ctx.strokeRect(80, 130, 352, 340);

        // Poster text
        ctx.fillStyle = inverted ? '#0f172a' : '#f8fafc';
        ctx.textAlign = 'center';
        
        if (isAlien) {
            ctx.font = 'bold 36px monospace';
            ctx.fillText('⎎⍜⍀⎎ ⏃⍀⏁', 256, 560);
            ctx.font = '24px monospace';
            ctx.fillText('⏁⊑⟒ ☌⏃⎎⟒⍀⊬ ⍜⎎ ⌇⍜⎎⟒', 256, 620);
        } else if (showCorridor) {
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText('YOU ARE HERE', 256, 560);
            // Draw a mini corridor schematic
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.strokeRect(180, 600, 152, 60);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(220, 630, 8, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.font = 'bold 44px "Outfit", sans-serif';
            ctx.fillText('ART GALLERY', 256, 570);
            ctx.font = '24px "Outfit", sans-serif';
            ctx.fillStyle = inverted ? '#475569' : '#94a3b8';
            ctx.fillText('GRAND EXHIBITION • EXIT 67', 256, 620);
            ctx.fillText('MODERN ABSTRACT ART', 256, 660);
        }

        return canvas;
    },

    drawStickmanPoster(state = 'normal') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Background
        if (state === 'bloody') {
            ctx.fillStyle = '#6b7280'; // Gray
            ctx.fillRect(0, 0, 512, 768);
            
            // Draw custom bloody handprint (procedural shapes)
            ctx.fillStyle = '#991b1b'; // Dark blood red
            
            // Palm
            ctx.beginPath();
            ctx.ellipse(256, 330, 50, 65, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Wrist base
            ctx.beginPath();
            ctx.moveTo(215, 380);
            ctx.lineTo(297, 380);
            ctx.lineTo(280, 430);
            ctx.lineTo(230, 430);
            ctx.closePath();
            ctx.fill();
            
            // Finger drawer helper
            const drawFinger = (fx, fy, radius, angle, length) => {
                ctx.save();
                ctx.translate(fx, fy);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.ellipse(0, -length/2, radius, length/2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };
            
            // Thumb
            drawFinger(205, 335, 10, -Math.PI / 3, 45);
            // Index
            drawFinger(220, 280, 11, -Math.PI / 20, 70);
            // Middle
            drawFinger(256, 270, 11, 0, 80);
            // Ring
            drawFinger(292, 280, 10.5, Math.PI / 24, 73);
            // Pinky
            drawFinger(320, 305, 9, Math.PI / 9, 53);
            
            // Blood drips running down
            ctx.fillStyle = '#7f1d1d';
            for (let i = 0; i < 4; i++) {
                const dropX = 220 + i * 22 + Math.random() * 8;
                const dropY = 400 + Math.random() * 15;
                const dropLen = 20 + Math.random() * 35;
                
                ctx.beginPath();
                ctx.moveTo(dropX - 2, dropY);
                ctx.lineTo(dropX + 2, dropY);
                ctx.lineTo(dropX + 1, dropY + dropLen);
                ctx.lineTo(dropX - 1, dropY + dropLen);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(dropX, dropY + dropLen, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.fillStyle = '#7f1d1d';
            ctx.font = 'bold 36px "Outfit"';
            ctx.textAlign = 'center';
            ctx.fillText('DANGER', 256, 540);
            ctx.font = '24px "Outfit"';
            ctx.fillText('DO NOT TOUCH THE WALLS', 256, 590);
            return canvas;
        } else if (state === 'blank') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 768);
            return canvas;
        }

        // Normal and Scream states
        ctx.fillStyle = state === 'scream' ? '#5c0c0c' : '#fef08a'; // Reddish or yellow
        ctx.fillRect(0, 0, 512, 768);

        // Draw Stickman
        ctx.strokeStyle = state === 'scream' ? '#ffffff' : '#1e293b';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(256, 250, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Face details for scream
        if (state === 'scream') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(240, 240, 6, 0, Math.PI*2); // left eye
            ctx.arc(272, 240, 6, 0, Math.PI*2); // right eye
            ctx.fill();
            
            // Screaming mouth
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(256, 270, 12, 20, 0, 0, Math.PI*2);
            ctx.stroke();
        }

        // Spine
        ctx.beginPath();
        ctx.moveTo(256, 300);
        ctx.lineTo(256, 480);
        ctx.stroke();

        // Arms
        ctx.beginPath();
        if (state === 'scream') {
            // Hands holding head in terror
            ctx.moveTo(256, 360);
            ctx.lineTo(190, 310);
            ctx.lineTo(210, 250);
            
            ctx.moveTo(256, 360);
            ctx.lineTo(322, 310);
            ctx.lineTo(302, 250);
        } else {
            // Happy waving stickman
            ctx.moveTo(256, 360);
            ctx.lineTo(170, 320);
            
            ctx.moveTo(256, 360);
            ctx.lineTo(340, 300);
            ctx.lineTo(380, 230); // wave hand
        }
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(256, 480);
        ctx.lineTo(180, 620);
        ctx.moveTo(256, 480);
        ctx.lineTo(332, 620);
        ctx.stroke();

        // Text
        ctx.fillStyle = state === 'scream' ? '#ffffff' : '#1e293b';
        ctx.textAlign = 'center';
        
        if (state === 'scream') {
            ctx.font = 'bold 44px monospace';
            ctx.fillText('AAAAAAAH!!!', 256, 700);
        } else if (state === 'alien') {
            ctx.font = 'bold 36px monospace';
            ctx.fillText('⍜⎎⟒ ⌇⏁⟟☊☍⋔⏃⋏', 256, 700);
        } else {
            ctx.font = 'bold 40px "Outfit", sans-serif';
            ctx.fillText('STICKMAN ADVENTURES', 256, 690);
        }

        return canvas;
    },

    drawTravelPoster(state = 'normal') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        if (state === 'snow') {
            // Snowy landscape
            ctx.fillStyle = '#bae6fd';
            ctx.fillRect(0, 0, 512, 768);

            // Sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, 400);
            sky.addColorStop(0, '#0284c7');
            sky.addColorStop(1, '#bae6fd');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, 512, 400);

            // Snow mountains
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(-50, 450);
            ctx.lineTo(150, 200);
            ctx.lineTo(350, 450);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(200, 450);
            ctx.lineTo(350, 250);
            ctx.lineTo(550, 450);
            ctx.fill();

            // Snowman
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(256, 520, 45, 0, Math.PI*2); // bottom
            ctx.arc(256, 450, 32, 0, Math.PI*2); // mid
            ctx.arc(256, 395, 20, 0, Math.PI*2); // head
            ctx.fill();

            // Snowman hat
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(236, 360, 40, 15);
            ctx.fillRect(246, 335, 20, 25);

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px "Outfit"';
            ctx.fillText('VISIT ALPS COLD PEAKS', 256, 640);
            ctx.font = '24px "Outfit"';
            ctx.fillText('EXOTIC WINTER RESORT', 256, 690);
            return canvas;
        }

        // Normal beach landscape
        ctx.fillStyle = '#fef08a'; // Beach sand
        ctx.fillRect(0, 0, 512, 768);

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, 450);
        sky.addColorStop(0, '#f97316'); // Orange sunset
        sky.addColorStop(0.6, '#e11d48'); // Pinkish horizon
        sky.addColorStop(1, '#3b82f6'); // Blue sea
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 512, 520);

        // Sun
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(256, 320, 75, 0, Math.PI * 2);
        ctx.fill();

        // Palm tree silhouette
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(80, 520);
        ctx.quadraticCurveTo(100, 350, 160, 280);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(160, 280, 15, 60, Math.PI/4, 0, Math.PI*2);
        ctx.ellipse(160, 280, 15, 60, -Math.PI/4, 0, Math.PI*2);
        ctx.fill();

        // Title
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        
        if (state === 'alien') {
            ctx.font = 'bold 36px monospace';
            ctx.fillText('⏁☌⏃⎎⟒⌰ ⏁⍜ ⌿⏃⎎⏃⎅⟟⌇⟒', 256, 630);
        } else {
            ctx.font = 'bold 42px "Outfit", sans-serif';
            ctx.fillText('TRAVEL TO PARADISE', 256, 620);
            ctx.font = '24px "Outfit", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText('BOOK YOUR SUMMER ESCAPE NOW', 256, 675);
            ctx.fillText('CRUISE DEALS FROM $67', 256, 715);
        }

        return canvas;
    },

    drawRestaurantPoster(state = 'normal') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        if (state === 'close') {
            ctx.fillStyle = '#374151'; // Dull dark gray
            ctx.fillRect(0, 0, 512, 768);

            // Dark plate
            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(256, 320, 150, 0, Math.PI*2);
            ctx.fill();

            // Closed stamp
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 15;
            ctx.strokeRect(100, 260, 312, 120);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 80px "Outfit"';
            ctx.textAlign = 'center';
            ctx.fillText('CLOSE', 256, 345);

            ctx.fillStyle = '#9ca3af';
            ctx.font = 'bold 36px "Outfit"';
            ctx.fillText('RESTAURANT CLOSED', 256, 570);
            ctx.font = '24px "Outfit"';
            ctx.fillText('NO FOOD SERVED TODAY', 256, 620);
            return canvas;
        }

        // Normal dining design
        ctx.fillStyle = '#fdf2f8'; // Romantic pinkish cream
        ctx.fillRect(0, 0, 512, 768);

        // Grid pattern for table cloth
        ctx.fillStyle = '#fce7f3';
        for (let i = 0; i < 512; i += 32) {
            ctx.fillRect(i, 0, 4, 768);
            ctx.fillRect(0, i, 512, 4);
        }

        // Red border ring plate
        ctx.fillStyle = '#db2777';
        ctx.beginPath();
        ctx.arc(256, 320, 160, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(256, 320, 135, 0, Math.PI * 2);
        ctx.fill();

        // Steak/food drawing
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(256, 320, 80, 50, Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        // Grill lines
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(210, 300); ctx.lineTo(290, 340);
        ctx.moveTo(230, 280); ctx.lineTo(310, 320);
        ctx.moveTo(190, 320); ctx.lineTo(270, 360);
        ctx.stroke();

        if (state === 'bug') {
            // Draw a giant bug on top of steak
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(250, 310, 20, 30, Math.PI/4, 0, Math.PI*2); // Body
            ctx.fill();
            
            // Bug legs
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(230, 290); ctx.lineTo(200, 280);
            ctx.moveTo(230, 310); ctx.lineTo(190, 310);
            ctx.moveTo(240, 330); ctx.lineTo(210, 340);
            ctx.moveTo(270, 290); ctx.lineTo(300, 280);
            ctx.moveTo(270, 310); ctx.lineTo(310, 310);
            ctx.stroke();
        }

        ctx.fillStyle = '#4d0527';
        ctx.textAlign = 'center';
        
        if (state === 'alien') {
            ctx.font = 'bold 36px monospace';
            ctx.fillText('⎎⟟⋔⟒ ⎎⟟⋔⟟⋔☌', 256, 580);
        } else {
            ctx.font = 'bold 44px "Outfit", sans-serif';
            ctx.fillText('FINE DINING', 256, 570);
            ctx.font = '24px "Outfit", sans-serif';
            ctx.fillStyle = '#db2777';
            ctx.fillText('GOURMET STEAKHOUSE', 256, 620);
            
            if (state === 'soldout') {
                // Giant RED SOLD OUT STAMP
                ctx.save();
                ctx.translate(256, 660);
                ctx.rotate(-0.15);
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 6;
                ctx.strokeRect(-160, -35, 320, 70);
                ctx.fillStyle = '#dc2626';
                ctx.font = 'bold 46px "Outfit"';
                ctx.fillText('SOLD OUT', 0, 15);
                ctx.restore();
            } else {
                ctx.fillStyle = '#7f1d1d';
                ctx.font = '22px "Outfit", sans-serif';
                ctx.fillText('OPEN DAILY 11:00 - 22:00', 256, 670);
            }
        }

        return canvas;
    },

    drawExitSign(numberText = "0", state = 'normal') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Dark metallic frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(16, 16, 480, 224);

        // Sign background glow
        let bgGlow = '#064e3b'; // Dark green
        let textGlow = '#10b981'; // Bright green

        if (state === 'flicker_off') {
            bgGlow = '#0b130f';
            textGlow = '#1e382d';
        } else if (state === 'glitch') {
            bgGlow = '#3b0764'; // Purple glow
            textGlow = '#d8b4fe';
        }

        ctx.fillStyle = bgGlow;
        ctx.fillRect(24, 24, 464, 208);

        if (numberText === 68 || numberText === "68" || state === 'escape') {
            ctx.shadowColor = textGlow;
            ctx.shadowBlur = 25;
            ctx.fillStyle = textGlow;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 90px "Share Tech Mono", monospace';
            ctx.fillText("Escape", 256, 128);
            ctx.shadowBlur = 0;
            return canvas;
        }

        // Green neon lights
        ctx.shadowColor = textGlow;
        ctx.shadowBlur = state === 'flicker_off' ? 0 : 25;
        
        ctx.fillStyle = textGlow;
        ctx.textAlign = 'center';
        ctx.font = 'bold 50px "Share Tech Mono", monospace';
        
        let label = "EXIT";
        if (state === 'no_escape') {
            label = "출구 없음";
            ctx.font = 'bold 44px sans-serif';
        }
        ctx.fillText(label, 150, 140);

        // Large exit number
        ctx.font = 'bold 120px "Share Tech Mono", monospace';
        let val = numberText;
        if (state === 'negative') {
            val = "-5";
        } else if (state === '444') {
            val = "444";
        } else if (state === 'victory') {
            val = "67";
        } else if (state === 'glitch') {
            val = "$&%";
        }
        
        ctx.fillText(val, 370, 160);

        // Reset shadow for subsequent drawings
        ctx.shadowBlur = 0;

        return canvas;
    },

    drawDoorText(text = "no anomaly", color = '#ff3366') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 512, 128);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 492, 108);

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 40px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 64);
        
        return canvas;
    },

    // Apply the active anomaly state to Three.js objects
    apply(scene, id, elements, exitNumber) {
        this.activeId = id;
        this.time = 0;
        
        // Reset scene to normal first
        this.clear(scene, elements, exitNumber);
        
        if (id === 0) return; // Normal hallway

        console.log(`Applying anomaly: #${id}`);

        if (id === 15) {
            this.corridor167mBrightened = false;
            if (scene && scene.fog) {
                scene.fog.density = 0.008; // 복도가 길어졌으므로 포그 밀도를 낮추어 시야 확보
            }
        }

        switch(id) {
            case 1: // 뒤돌아보지 마세요
                if (elements.doorFrontTextMaterial) {
                    const canvasText = this.drawDoorText("Please don't look back.", '#ef4444');
                    elements.doorFrontTextMaterial.map = new THREE.CanvasTexture(canvasText);
                    elements.doorFrontTextMaterial.needsUpdate = true;
                }
                break;
            case 2: // 포스터 뒤집힘
                elements.posters.forEach(p => p.rotation.z = Math.PI);
                break;
            case 3: // 붉은 손자국 포스터
                if (elements.posterMaterials[1]) {
                    const canvas = this.drawStickmanPoster('bloody');
                    elements.posterMaterials[1].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[1].needsUpdate = true;
                }
                break;
            case 4: // 식당 폐점
                if (elements.posterMaterials[3]) {
                    const canvas = this.drawRestaurantPoster('close');
                    elements.posterMaterials[3].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[3].needsUpdate = true;
                }
                break;
            case 5: // 작아지는 포스터 (접근 시 복구)
                elements.posters.forEach(p => p.scale.set(1.3, 1.3, 1));
                break;
            case 6: // 추락하는 여행 포스터 (Z = -19)
                // Set flag to handle inside update loop
                elements.thirdPosterState = 'hanging';
                break;
            case 7: // 좌우로 흔들리는 포스터
                // Handled in update
                break;
            case 8: // 새파란 손자국 추격
                // Create a blue handprint mesh on floor
                const handGeo = new THREE.PlaneGeometry(0.8, 0.8);
                const handMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                
                // Draw custom handprint (procedural shapes matching poster 2)
                const handCanvas = document.createElement('canvas');
                handCanvas.width = 256; handCanvas.height = 256;
                const handCtx = handCanvas.getContext('2d');
                handCtx.fillStyle = '#00E5FF';
                
                // Palm
                handCtx.beginPath();
                handCtx.ellipse(128, 128, 25, 32, 0, 0, Math.PI * 2);
                handCtx.fill();
                
                // Wrist base
                handCtx.beginPath();
                handCtx.moveTo(107, 153);
                handCtx.lineTo(148, 153);
                handCtx.lineTo(140, 178);
                handCtx.lineTo(115, 178);
                handCtx.closePath();
                handCtx.fill();
                
                // Finger drawer helper
                const drawFinger = (fx, fy, radius, angle, length) => {
                    handCtx.save();
                    handCtx.translate(fx, fy);
                    handCtx.rotate(angle);
                    handCtx.beginPath();
                    handCtx.ellipse(0, -length/2, radius, length/2, 0, 0, Math.PI * 2);
                    handCtx.fill();
                    handCtx.restore();
                };
                
                // Thumb
                drawFinger(103, 130, 5, -Math.PI / 3, 22);
                // Index
                drawFinger(110, 103, 5.5, -Math.PI / 20, 35);
                // Middle
                drawFinger(128, 98, 5.5, 0, 40);
                // Ring
                drawFinger(146, 103, 5.25, Math.PI / 24, 36);
                // Pinky
                drawFinger(160, 115, 4.5, Math.PI / 9, 26);
                
                handMat.map = new THREE.CanvasTexture(handCanvas);
                
                elements.blueHandprint = new THREE.Mesh(handGeo, handMat);
                elements.blueHandprint.rotation.x = -Math.PI / 2;
                elements.blueHandprint.position.set(0, 0.01, -15);
                scene.add(elements.blueHandprint);
                elements.blueHandState = 'idle'; // idle, chasing
                break;
            case 9: // 거대해지는 첫째 문
                // Handled in update (smoothly expand door 1)
                break;
            case 10: // 커진 문들
                elements.rightDoors.forEach(d => {
                    d.scale.set(1.3, 1.3, 1.3);
                });
                break;
            case 11: // 두드리는 문
                elements.bangingDoorState = 'banging';
                elements.bangingTimer = 0;
                break;
            case 12: // 축소된 셋째 문
                const d3 = elements.rightDoors[2];
                if (d3) {
                    d3.scale.set(0.7, 0.7, 0.7);
                }
                break;
            case 13: // 내려오는 천장
                // Handled in update
                window.gameAudio.startCeilingHum();
                break;
            case 14: // 그림자 추격자
                // Bright hallway
                elements.lights.forEach(l => l.intensity = 2.5);
                scene.background = new THREE.Color(0x222225);
                
                // Spawn shadow mesh at Z = -27
                const shadowGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 16);
                const shadowMat = new THREE.MeshBasicMaterial({ color: 0x010101 });
                elements.shadowFigure = new THREE.Mesh(shadowGeo, shadowMat);
                elements.shadowFigure.position.set(0, 0.9, -27);
                scene.add(elements.shadowFigure);
                elements.shadowState = 'idle'; // idle, chasing
                break;
            case 15: // 167m 복도 & 67개 문 (Handled in game.js directly as it changes geometry)
                break;
            case 16: // 음수 표시판
                if (elements.exitSignMaterial) {
                    const canvas = this.drawExitSign(exitNumber, 'negative');
                    elements.exitSignMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.exitSignMaterial.needsUpdate = true;
                }
                break;
            case 17: // 444 표시판
                if (elements.exitSignMaterial) {
                    const canvas = this.drawExitSign(exitNumber, '444');
                    elements.exitSignMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.exitSignMaterial.needsUpdate = true;
                }
                break;
            case 18: // 깜빡이는 표시판
                // Handled in update
                break;
            case 19: // 출구 없음 표시판
                if (elements.exitSignMaterial) {
                    const canvas = this.drawExitSign(exitNumber, 'no_escape');
                    elements.exitSignMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.exitSignMaterial.needsUpdate = true;
                }
                break;
            case 20: // 뒤집힌 표시판
                if (elements.exitSign) {
                    elements.exitSign.rotation.z = Math.PI;
                    elements.exitSign.position.y = 1.9; // Adjust height slightly
                }
                break;
            case 21: // 사라진 표시판
                if (elements.exitSign) elements.exitSign.visible = false;
                break;
            case 22: // 핑크색 소화전
                if (elements.hydrantParts) {
                    elements.hydrantParts.forEach(p => p.color.setHex(0xff66cc));
                }
                break;
            case 23: // 거대 소화전
                if (elements.hydrant) {
                    elements.hydrant.scale.set(2.0, 2.0, 2.0);
                    elements.hydrant.position.y = 0.5; // adjust position
                }
                break;
            case 24: // 소화전 누수
                // Add water plane reflecting lights
                const waterGeo = new THREE.PlaneGeometry(4, 30);
                const waterMat = new THREE.MeshStandardMaterial({
                    color: 0x334455,
                    roughness: 0.1,
                    metalness: 0.9,
                    transparent: true,
                    opacity: 0.5
                });
                elements.waterPuddle = new THREE.Mesh(waterGeo, waterMat);
                elements.waterPuddle.rotation.x = -Math.PI/2;
                elements.waterPuddle.position.set(0, 0.01, -15);
                scene.add(elements.waterPuddle);
                break;
            case 25: // 사라진 소화전
                if (elements.hydrant) elements.hydrant.visible = false;
                break;
            case 26: // 공중부양 소화전
                if (elements.hydrant) {
                    elements.hydrant.position.y = 1.2;
                }
                break;
            case 27: // 색상 반전 미술 포스터
                if (elements.posterMaterials[0]) {
                    const canvas = this.drawArtGalleryPoster(true);
                    elements.posterMaterials[0].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[0].needsUpdate = true;
                }
                break;
            case 28: // 액자 속 복도
                if (elements.posterMaterials[0]) {
                    const canvas = this.drawArtGalleryPoster(false, false, true);
                    elements.posterMaterials[0].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[0].needsUpdate = true;
                }
                break;
            case 29: // 비명 지르는 졸라맨
                if (elements.posterMaterials[1]) {
                    const canvas = this.drawStickmanPoster('scream');
                    elements.posterMaterials[1].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[1].needsUpdate = true;
                }
                elements.screamingStickmanState = 'silent';
                break;
            case 30: // 백지 포스터
                if (elements.posterMaterials[1]) {
                    const canvas = this.drawStickmanPoster('blank');
                    elements.posterMaterials[1].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[1].needsUpdate = true;
                }
                break;
            case 31: // 설산 여행 포스터
                if (elements.posterMaterials[2]) {
                    const canvas = this.drawTravelPoster('snow');
                    elements.posterMaterials[2].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[2].needsUpdate = true;
                }
                break;
            case 32: // 거울 포스터
                if (elements.posters[2]) {
                    elements.posters[2].material = new THREE.MeshStandardMaterial({
                        color: 0xcccccc,
                        metalness: 1.0,
                        roughness: 0.05
                    });
                }
                break;
            case 33: // 곤충 요리 포스터
                if (elements.posterMaterials[3]) {
                    const canvas = this.drawRestaurantPoster('bug');
                    elements.posterMaterials[3].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[3].needsUpdate = true;
                }
                break;
            case 34: // 매진 낙서 포스터
                if (elements.posterMaterials[3]) {
                    const canvas = this.drawRestaurantPoster('soldout');
                    elements.posterMaterials[3].map = new THREE.CanvasTexture(canvas);
                    elements.posterMaterials[3].needsUpdate = true;
                }
                break;
            case 35: // SOS 깜빡임
                // Handled in update
                break;
            case 36: // 노란 던전 조명
                elements.lights.forEach(l => {
                    l.color.setHex(0xffaa22);
                    l.intensity = 0.8;
                });
                break;
            case 37: // 양방향 손잡이
                elements.rightDoors.forEach(d => {
                    const handle = d.getObjectByName("handle");
                    if (handle) {
                        const clone = handle.clone();
                        // Mirror it to other side (normally handle is on X=0.35, put on X=-0.35)
                        clone.position.x = -handle.position.x;
                        d.add(clone);
                        d.userData.clonedHandle = clone;
                    }
                });
                break;
            case 38: // 열린 문과 붉은 빛 (클릭 시 게임오버)
                const d1 = elements.rightDoors[0];
                if (d1) {
                    d1.rotation.y = 0.15; // Swing slightly open
                    // Red light leaking from inside
                    const redLight = new THREE.PointLight(0xff0000, 2, 3);
                    redLight.position.set(2.2, 1.0, -8);
                    scene.add(redLight);
                    elements.keyholeRedLight = redLight;
                    elements.keyholeState = 'active';
                }
                break;
            case 39: // 회전하는 손잡이
                // Handled in update
                break;
            case 40: // 암흑 유리창
                // Create a dark rectangular mesh over door 2 panel to simulate dark window cutout
                const winGeo = new THREE.PlaneGeometry(0.35, 0.45);
                const winMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                elements.voidWindow = new THREE.Mesh(winGeo, winMat);
                // Attach slightly offset on Z to overlap door 2 surface (at X=2.0)
                elements.voidWindow.rotation.y = -Math.PI/2;
                elements.voidWindow.position.set(1.98, 1.4, -15);
                scene.add(elements.voidWindow);
                break;
            case 41: // 이끼 낀 벽
                if (elements.rightWall) {
                    elements.rightWall.material.color.setHex(0x1e3f20); // Mossy dark green color tint
                }
                break;
            case 42: // 기울어진 복도
                if (elements.leftWall && elements.rightWall) {
                    elements.leftWall.rotation.z = 0.08;
                    elements.rightWall.rotation.z = -0.08;
                }
                break;
            case 43: // 벽돌이 된 문
                const door2 = elements.rightDoors[1];
                if (door2) {
                    door2.visible = false;
                    // Replace with brick block
                    const brickGeo = new THREE.BoxGeometry(0.2, 2.0, 1.0);
                    // Procedural brick look
                    const brickCanvas = document.createElement('canvas');
                    brickCanvas.width = 128; brickCanvas.height = 128;
                    const bCtx = brickCanvas.getContext('2d');
                    bCtx.fillStyle = '#b91c1c';
                    bCtx.fillRect(0,0,128,128);
                    bCtx.strokeStyle = '#ef4444';
                    bCtx.lineWidth = 4;
                    for(let i=0; i<128; i+=32) {
                        bCtx.strokeRect(0, i, 128, 32);
                    }
                    const brickMat = new THREE.MeshStandardMaterial({
                        map: new THREE.CanvasTexture(brickCanvas),
                        roughness: 0.8
                    });
                    elements.brickWallBlock = new THREE.Mesh(brickGeo, brickMat);
                    elements.brickWallBlock.position.set(2.0, 1.0, -15);
                    scene.add(elements.brickWallBlock);
                }
                break;
            case 44: // 붉은 액체가 떨어진 마룻바닥
                if (elements.floorMaterial) {
                    const canvas = this.drawWoodFloor();
                    const fCtx = canvas.getContext('2d');
                    
                    // Seeded random for blood splatters to keep them static and tileable
                    let seed = 999;
                    function bloodRand() {
                        let x = Math.sin(seed++) * 10000;
                        return x - Math.floor(x);
                    }
                    
                    fCtx.fillStyle = '#7a0909'; // dark blood red
                    
                    // Draw 3 blood splatter groups on the tile
                    for (let s = 0; s < 3; s++) {
                        const centerX = 80 + bloodRand() * 350;
                        const centerY = 80 + bloodRand() * 350;
                        const baseRad = 15 + bloodRand() * 20;
                        
                        fCtx.beginPath();
                        // Main pool
                        fCtx.arc(centerX, centerY, baseRad, 0, Math.PI * 2);
                        
                        // Secondary overlapping drops
                        const overlapCount = 2 + Math.floor(bloodRand() * 3);
                        for (let o = 0; o < overlapCount; o++) {
                            const angle = bloodRand() * Math.PI * 2;
                            const dist = baseRad * (0.4 + bloodRand() * 0.5);
                            const rad = baseRad * (0.3 + bloodRand() * 0.4);
                            const x = centerX + Math.cos(angle) * dist;
                            const y = centerY + Math.sin(angle) * dist;
                            fCtx.arc(x, y, rad, 0, Math.PI * 2);
                        }
                        fCtx.fill();
                        
                        // Small splatter drops around
                        fCtx.beginPath();
                        const dropCount = 4 + Math.floor(bloodRand() * 6);
                        for (let d = 0; d < dropCount; d++) {
                            const angle = bloodRand() * Math.PI * 2;
                            const dist = baseRad * (1.2 + bloodRand() * 1.5);
                            const rad = 2 + bloodRand() * 4;
                            const x = centerX + Math.cos(angle) * dist;
                            const y = centerY + Math.sin(angle) * dist;
                            fCtx.arc(x, y, rad, 0, Math.PI * 2);
                        }
                        fCtx.fill();
                        
                        // Add a subtle glossy specular highlight to the blood to make it look liquid
                        fCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                        fCtx.beginPath();
                        fCtx.arc(centerX - baseRad*0.3, centerY - baseRad*0.3, baseRad*0.2, 0, Math.PI*2);
                        fCtx.fill();
                        
                        fCtx.fillStyle = '#7a0909'; // restore blood red
                    }
                    
                    const length = (this.activeId === 15) ? 167 : 30;
                    elements.floorMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.floorMaterial.map.wrapS = THREE.RepeatWrapping;
                    elements.floorMaterial.map.wrapT = THREE.RepeatWrapping;
                    elements.floorMaterial.map.repeat.set(4, length);
                    elements.floorMaterial.needsUpdate = true;
                }
                break;
            case 45: // 친절한 화살표
                if (elements.floorMaterial) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256; canvas.height = 256;
                    const fCtx = canvas.getContext('2d');
                    fCtx.fillStyle = '#222';
                    fCtx.fillRect(0,0,256,256);
                    fCtx.strokeStyle = '#eab308';
                    fCtx.lineWidth = 12;
                    // Draw backward arrows (pointing upwards in UV space)
                    fCtx.beginPath();
                    fCtx.moveTo(128, 20); fCtx.lineTo(128, 230);
                    fCtx.moveTo(60, 80); fCtx.lineTo(128, 20); fCtx.lineTo(196, 80);
                    fCtx.stroke();
                    elements.floorMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.floorMaterial.map.wrapS = THREE.RepeatWrapping;
                    elements.floorMaterial.map.wrapT = THREE.RepeatWrapping;
                    elements.floorMaterial.map.repeat.set(2, 10);
                    elements.floorMaterial.needsUpdate = true;
                }
                break;
            case 46: // 천장과 바닥의 반전
                // Handled in update by rotating camera.z = Math.PI
                break;
            case 47: // 천장 환풍기
                elements.ceilingFans = [];
                const fanGeo = new THREE.PlaneGeometry(0.8, 0.8);
                const fanCanvas = document.createElement('canvas');
                fanCanvas.width = 128; fanCanvas.height = 128;
                const fanCtx = fanCanvas.getContext('2d');
                fanCtx.fillStyle = '#1e293b';
                // Draw 4 fan blades
                fanCtx.translate(64, 64);
                for (let i = 0; i < 4; i++) {
                    fanCtx.rotate(Math.PI / 2);
                    fanCtx.fillRect(-8, 10, 16, 50);
                }
                const fanMat = new THREE.MeshBasicMaterial({
                    map: new THREE.CanvasTexture(fanCanvas),
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                const positions = [-7.5, -15, -22.5];
                positions.forEach(z => {
                    const fan = new THREE.Mesh(fanGeo, fanMat);
                    fan.rotation.x = Math.PI / 2;
                    fan.position.set(0, 2.98, z);
                    scene.add(fan);
                    elements.ceilingFans.push(fan);
                });
                break;
            case 48: // 바닥 균열
                if (elements.floorMaterial) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 512; canvas.height = 512;
                    const fCtx = canvas.getContext('2d');
                    fCtx.fillStyle = '#222';
                    fCtx.fillRect(0,0,512,512);
                    fCtx.strokeStyle = '#000000';
                    fCtx.lineWidth = 8;
                    // Draw random cracking lines
                    for (let i=0; i<15; i++) {
                        fCtx.beginPath();
                        fCtx.moveTo(Math.random()*512, Math.random()*512);
                        fCtx.lineTo(Math.random()*512, Math.random()*512);
                        fCtx.lineTo(Math.random()*512, Math.random()*512);
                        fCtx.stroke();
                    }
                    elements.floorMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.floorMaterial.map.wrapS = THREE.RepeatWrapping;
                    elements.floorMaterial.map.wrapT = THREE.RepeatWrapping;
                    elements.floorMaterial.map.repeat.set(2, 10);
                    elements.floorMaterial.needsUpdate = true;
                }
                break;
            case 49: // 레트로 카페트
                if (elements.floorMaterial) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 128; canvas.height = 128;
                    const fCtx = canvas.getContext('2d');
                    fCtx.fillStyle = '#7f1d1d'; // Dark red
                    fCtx.fillRect(0, 0, 128, 128);
                    fCtx.fillStyle = '#b45309'; // Yellow gold lines
                    for (let i = 0; i < 128; i += 32) {
                        fCtx.fillRect(i, 0, 8, 128);
                        fCtx.fillRect(0, i, 128, 8);
                        // Draw diagonal diamond patterns
                        fCtx.fillStyle = '#b91c1c';
                        fCtx.fillRect(i+10, i+10, 12, 12);
                    }
                    elements.floorMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.floorMaterial.map.wrapS = THREE.RepeatWrapping;
                    elements.floorMaterial.map.wrapT = THREE.RepeatWrapping;
                    elements.floorMaterial.map.repeat.set(4, 30);
                    elements.floorMaterial.needsUpdate = true;
                }
                break;
            case 50: // 끝없는 낭떠러지
                // Visually cover Z=[-16.5, -13.5] with black pit mesh
                const pitGeo = new THREE.PlaneGeometry(4, 3);
                const pitMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                elements.voidPit = new THREE.Mesh(pitGeo, pitMat);
                elements.voidPit.rotation.x = -Math.PI/2;
                elements.voidPit.position.set(0, 0.015, -15);
                scene.add(elements.voidPit);
                elements.pitState = 'active';
                break;
            case 51: // 구두 발자국 소리
                // Handled in player steps
                break;
            case 52: // 방전된 손전등
                // Handled in update by dimming light
                break;
            case 53: // 네온 초록 손전등
                // Handled in update by setting light color
                break;
            case 54: // 괘종시계 소리
                window.gameAudio.startClockTick(0.5);
                break;
            case 55: // 속삭이는 벽
                window.gameAudio.startWhisper();
                break;
            case 56: // 빗소리와 천둥
                window.gameAudio.startRainAndThunder();
                break;
            case 57: // 끈적한 걸음
                // Handled in movement calculation
                break;
            case 58: // 초중력
                // Handled in movement/running limits
                break;
            case 59: // 스트로보 조명
                // Handled in update
                break;
            case 60: // 외계어 포스터
                for (let i = 0; i < 4; i++) {
                    if (elements.posterMaterials[i]) {
                        let canvas;
                        if (i === 0) canvas = this.drawArtGalleryPoster(false, true);
                        if (i === 1) canvas = this.drawStickmanPoster('alien');
                        if (i === 2) canvas = this.drawTravelPoster('alien');
                        if (i === 3) canvas = this.drawRestaurantPoster('alien');
                        elements.posterMaterials[i].map = new THREE.CanvasTexture(canvas);
                        elements.posterMaterials[i].needsUpdate = true;
                    }
                }
                break;
            case 61: // 글리치 간판
                if (elements.exitSignMaterial) {
                    const canvas = this.drawExitSign(exitNumber, 'glitch');
                    elements.exitSignMaterial.map = new THREE.CanvasTexture(canvas);
                    elements.exitSignMaterial.needsUpdate = true;
                }
                break;
            case 62: // 유령 바람
                elements.postersFlapping = true;
                break;
            case 63: // 뒤집힌 소화전
                if (elements.hydrant) {
                    elements.hydrant.rotation.x = Math.PI;
                    elements.hydrant.position.y = 1.0;
                }
                break;
            case 64: // 거대 안내 텍스트
                if (elements.doorFrontTextMesh) elements.doorFrontTextMesh.scale.set(3, 3, 1);
                if (elements.doorBackTextMesh) elements.doorBackTextMesh.scale.set(3, 3, 1);
                break;
            case 65: // 첨벙거리는 발걸음
                // Handled in step sound triggers
                break;
            case 66: // 쌍둥이 소화전
                if (elements.hydrant) {
                    const clone = elements.hydrant.clone();
                    clone.position.z -= 0.6; // Shift slightly next to first
                    scene.add(clone);
                    elements.clonedHydrant = clone;
                }
                break;
            case 67: // 적색경보
                elements.lights.forEach(l => {
                    l.color.setHex(0xff0000);
                    l.intensity = 2.0;
                });
                elements.redAlertState = 'active';
                break;
        }
    },

    // Update continuous animation details for anomalies
    update(elements, playerPos, isMoving, isRunning, deltaTime, triggerGameOver) {
        this.time += deltaTime;
        
        if (this.activeId === 0) return;

        // 15. 167m 복도 조명 밝기 제어 (Z <= -145.0 도달 시 0.2 -> 1.0 영구 유지)
        if (this.activeId === 15) {
            if (!this.corridor167mBrightened && playerPos.z <= -145.0) {
                this.corridor167mBrightened = true;
            }
            const targetIntensity = this.corridor167mBrightened ? 1.0 : 0.2;
            if (elements.lights) {
                elements.lights.forEach(light => {
                    light.intensity = targetIntensity;
                });
            }
        }

        // 5. 거대 포스터 -> 접근 시 원래 크기 복귀
        if (this.activeId === 5) {
            if (playerPos.z < -2.5 || elements.postersShrinkingStarted) {
                elements.postersShrinkingStarted = true;
                elements.posters.forEach(p => {
                    const scale = THREE.MathUtils.lerp(p.scale.x, 1, deltaTime * 0.8);
                    p.scale.set(scale, scale, 1);
                });
            }
        }

        // 6. 추락하는 여행 포스터 (Z = -19)
        if (this.activeId === 6 && elements.thirdPosterState === 'hanging') {
            const poster = elements.posters[2];
            const dist = Math.abs(playerPos.z - poster.position.z);
            if (dist < 5.0) {
                elements.thirdPosterState = 'shaking';
                elements.thirdPosterTimer = 0;
                window.gameAudio.playPosterRattle();
            }
        }
        if (this.activeId === 6 && elements.thirdPosterState === 'shaking') {
            const poster = elements.posters[2];
            elements.thirdPosterTimer += deltaTime;
            
            // Shake horizontal/vertical
            poster.position.x = -1.99 + Math.sin(elements.thirdPosterTimer * 50) * 0.05;
            poster.position.y = 1.5 + Math.cos(elements.thirdPosterTimer * 40) * 0.03;
            
            if (elements.thirdPosterTimer > 0.8) {
                elements.thirdPosterState = 'falling';
                elements.thirdPosterVelY = 0;
                window.gameAudio.playPosterFall();
            }
        }
        if (this.activeId === 6 && elements.thirdPosterState === 'falling') {
            const poster = elements.posters[2];
            elements.thirdPosterVelY += deltaTime * 9.8; // gravity
            poster.position.y -= elements.thirdPosterVelY * deltaTime;
            
            // Rotate forward
            poster.rotation.x = THREE.MathUtils.lerp(poster.rotation.x, -Math.PI / 2, deltaTime * 8);
            
            if (poster.position.y <= 0.1) {
                poster.position.y = 0.02;
                poster.rotation.x = -Math.PI / 2;
                elements.thirdPosterState = 'dropped';
            }
        }

        // 7. 좌우 흔들리는 포스터
        if (this.activeId === 7) {
            elements.posters.forEach((p, idx) => {
                p.position.z = p.userData.originalZ + Math.sin(this.time * 6 + idx) * 0.15;
            });
        }

        // 8. 새파란 손자국 추격 (게임오버)
        if (this.activeId === 8 && elements.blueHandprint) {
            const hand = elements.blueHandprint;
            const dist = playerPos.distanceTo(hand.position);
            
            if (elements.blueHandState === 'idle' && dist < 6.0) {
                elements.blueHandState = 'chasing';
                elements.blueHandStampTimer = 0.4; // trigger first stamp almost immediately
            }
            
            if (elements.blueHandState === 'chasing') {
                if (elements.blueHandStampTimer === undefined) {
                    elements.blueHandStampTimer = 0;
                }
                
                elements.blueHandStampTimer += deltaTime;
                
                if (elements.blueHandStampTimer >= 0.5) {
                    elements.blueHandStampTimer = 0;
                    
                    // Stamp towards player
                    const dir = new THREE.Vector3().subVectors(playerPos, hand.position);
                    dir.y = 0; // lock to floor
                    const distance = dir.length();
                    dir.normalize();
                    
                    // Move forward by 1.1 meters (speed: 2.2 m/s over 0.5s)
                    const stepDist = Math.min(1.1, distance);
                    hand.position.addScaledVector(dir, stepDist);
                    
                    // Rotate towards player
                    hand.rotation.z = Math.atan2(dir.x, dir.z);
                    
                    // Play stamping thump sound (procedural Web Audio)
                    if (window.gameAudio && window.gameAudio.ctx) {
                        const ctx = window.gameAudio.ctx;
                        const now = ctx.currentTime;
                        
                        // Deep low impact (쾅!)
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(90, now);
                        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
                        
                        gain.gain.setValueAtTime(window.gameAudio.masterVolume * 1.5, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                        
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 0.15);
                    }
                }
                
                // Hit player (checked every frame)
                if (dist < 0.6) {
                    triggerGameOver('blue_hand');
                }
            }
        }

        // 9. 거대해지는 첫째 문
        if (this.activeId === 9) {
            const d1 = elements.rightDoors[0];
            if (d1 && d1.scale.x < 1.5) {
                // Speed reduced from 0.15 to 0.015 (10x slower, highly subtle expansion)
                const speed = 0.015 * deltaTime;
                d1.scale.x = Math.min(d1.scale.x + speed, 1.5);
                d1.scale.y = Math.min(d1.scale.y + speed, 1.5);
                d1.scale.z = Math.min(d1.scale.z + speed, 1.5);
            }
        }

        // 11. 두드리는 문
        if (this.activeId === 11 && elements.bangingDoorState === 'banging') {
            elements.bangingTimer += deltaTime;
            const d2 = elements.rightDoors[1];
            
            if (elements.bangingTimer > 2.0) {
                // Play bangs every 2-3 seconds
                window.gameAudio.playDoorBang();
                elements.bangingTimer = 0;
            }
            
            // Rapid vibrating rotation offset during thumping
            if (elements.bangingTimer < 0.5) {
                d2.rotation.y = Math.sin(this.time * 90) * 0.05;
            } else {
                d2.rotation.y = 0;
            }
        }

        // 13. 내려오는 천장 (게임오버)
        if (this.activeId === 13) {
            if (elements.ceiling) {
                // Slowly drop Y
                elements.ceiling.position.y -= 0.18 * deltaTime;
                
                // Update ceiling lights height
                elements.lights.forEach(l => l.position.y = elements.ceiling.position.y - 0.1);
                
                // Crushed player?
                if (elements.ceiling.position.y < 1.1) {
                    triggerGameOver('ceiling_crush');
                }
            }
        }

        // 14. 그림자 추격자 (게임오버)
        if (this.activeId === 14 && elements.shadowFigure) {
            const shadow = elements.shadowFigure;
            const dist = playerPos.distanceTo(shadow.position);
            
            if (elements.shadowState === 'idle' && dist < 12.0) {
                elements.shadowState = 'chasing';
            }
            
            if (elements.shadowState === 'chasing') {
                // Move towards player
                const dir = new THREE.Vector3().subVectors(playerPos, shadow.position);
                dir.y = 0;
                dir.normalize();
                
                // High chase speed
                shadow.position.addScaledVector(dir, 4.2 * deltaTime);
                
                if (dist < 0.8) {
                    triggerGameOver('shadow_catch');
                }
            }
        }

        // 18. 깜빡이는 표시판
        if (this.activeId === 18 && elements.exitSign) {
            // Rapid blink
            elements.exitSign.visible = Math.floor(this.time * 10) % 2 === 0;
        }

        // 29. 비명 지르는 졸라맨 (근처에 가면 비명 지름)
        if (this.activeId === 29 && elements.screamingStickmanState === 'silent') {
            const poster = elements.posters[1];
            const dist = Math.abs(playerPos.z - poster.position.z);
            if (dist < 4.0) {
                elements.screamingStickmanState = 'screaming';
                window.gameAudio.playScream();
            }
        }
        if (this.activeId === 29 && elements.screamingStickmanState === 'screaming') {
            const poster = elements.posters[1];
            // Visual vibration of poster during screaming
            poster.position.x = -1.99 + Math.sin(this.time * 80) * 0.03;
            poster.position.y = 1.5 + Math.cos(this.time * 70) * 0.02;
        }

        // 35. SOS 깜빡임
        if (this.activeId === 35) {
            // SOS Morse Code timing: S = ... (short), O = --- (long), S = ... (short)
            // We can code a cycle duration of 6 seconds
            const cycle = this.time % 6.0;
            let lit = true;
            
            // Timeline offsets in seconds
            const dots = (t) => t >= 0 && t < 0.2 || t >= 0.4 && t < 0.6 || t >= 0.8 && t < 1.0;
            const dashes = (t) => t >= 1.5 && t < 2.0 || t >= 2.3 && t < 2.8 || t >= 3.1 && t < 3.6;
            const dots2 = (t) => t >= 4.1 && t < 4.3 || t >= 4.5 && t < 4.7 || t >= 4.9 && t < 5.1;
            
            if (dots(cycle) || dashes(cycle) || dots2(cycle)) {
                lit = false;
            }
            
            elements.lights.forEach(l => l.intensity = lit ? 0.5 : 0.05);
        }

        // 38. 열린 문과 붉은 빛 (클래식 클릭/접근 시 게임오버)
        if (this.activeId === 38 && elements.keyholeState === 'active') {
            const doorPos = new THREE.Vector3(2.0, 1.0, -8);
            const dist = playerPos.distanceTo(doorPos);
            if (dist < 1.2) {
                triggerGameOver('red_light');
            }
        }

        // 39. 회전하는 손잡이
        if (this.activeId === 39) {
            const handle = elements.rightDoors[1].getObjectByName("handle");
            if (handle) {
                handle.rotation.z += 15 * deltaTime; // rapid spin
            }
        }

        // 46. 천장과 바닥 반전
        // Handled in camera update in game.js

        // 47. 천장 환풍기 회전
        if (this.activeId === 47 && elements.ceilingFans) {
            elements.ceilingFans.forEach(f => f.rotation.z += 2.0 * deltaTime);
        }

        // 50. 끝없는 낭떠러지 낙하 판정 (Z=[-16.2, -13.8])
        if (this.activeId === 50 && elements.pitState === 'active') {
            if (playerPos.z < -13.6 && playerPos.z > -16.4 && Math.abs(playerPos.x) < 1.8) {
                elements.pitState = 'falling';
                elements.fallingTimer = 0;
            }
        }
        if (this.activeId === 50 && elements.pitState === 'falling') {
            // Trigger fall animation inside game update
            elements.fallingTimer += deltaTime;
            if (elements.fallingTimer > 0.8) {
                triggerGameOver('pit_fall');
            }
        }

        // 52. 방전된 손전등
        if (this.activeId === 52) {
            if (elements.flashlight) {
                // Fast micro-flickers + extremely dim base
                const flicker = Math.random() < 0.2 ? 0.05 : 0.35;
                elements.flashlight.intensity = flicker;
            }
        }

        // 53. 네온 초록 손전등
        if (this.activeId === 53 && elements.flashlight) {
            elements.flashlight.color.setHex(0x00ff66);
            elements.flashlight.intensity = 2.0;
        }

        // 54. 괘종시계 소리 볼륨 증가
        if (this.activeId === 54) {
            // Closer to front door (Z=-30) => louder clock sound
            // normal start Z=0, front Z=-30.
            const factor = THREE.MathUtils.clamp(Math.abs(playerPos.z) / 30.0, 0.1, 1.0);
            window.gameAudio.stopClockTick();
            window.gameAudio.startClockTick(factor);
        }

        // 59. 스트로보 조명
        if (this.activeId === 59) {
            const on = Math.random() < 0.15;
            elements.lights.forEach(l => l.intensity = on ? 2.5 : 0.0);
        }

        // 62. 유령 바람 (포스터 펄럭펄럭)
        if (this.activeId === 62 && elements.postersFlapping) {
            elements.posters.forEach((p, idx) => {
                const theta = 0.04 + Math.sin(this.time * 10 + idx * 2) * 0.04;
                p.position.x = -1.99 + Math.sin(theta) * 0.45;
                p.position.z = (p.userData.originalZ + 0.45) - Math.cos(theta) * 0.45;
                p.rotation.y = Math.PI / 2 + theta;
            });
        }

        // 67. 적색경보등 회전
        if (this.activeId === 67 && elements.redAlertState === 'active') {
            // We can spin the lights slightly
            elements.lights.forEach((l, idx) => {
                l.position.x = Math.sin(this.time * 4 + idx) * 1.5;
                l.position.z = l.userData.originalZ + Math.cos(this.time * 4 + idx) * 1.5;
            });
        }
    },

    // Clear anomalies to restore default corridor state
    clear(scene, elements, exitNumber) {
        console.log("Restoring corridor to normal");
        
        // Stop dynamic sounds
        window.gameAudio.stopCeilingHum();
        window.gameAudio.stopClockTick();
        window.gameAudio.stopWhisper();
        window.gameAudio.stopRainAndThunder();

        // 1. Text reset
        if (elements.doorFrontTextMaterial) {
            const canvasText = this.drawDoorText("no anomaly", '#ff3366');
            elements.doorFrontTextMaterial.map = new THREE.CanvasTexture(canvasText);
            elements.doorFrontTextMaterial.needsUpdate = true;
        }

        // 2. Poster rotations
        elements.posters.forEach(p => {
            p.rotation.set(0, Math.PI / 2, 0);
            p.scale.set(1, 1, 1);
            p.position.y = 1.5;
            if (p.userData.originalZ !== undefined) {
                p.position.z = p.userData.originalZ;
                p.position.x = -1.99;
            }
        });

        // 3. Bloody stickman & 4. restaurant close & 27/28/30/31/33/34
        if (elements.posterMaterials) {
            if (elements.posterMaterials[0]) {
                const canvas = this.drawArtGalleryPoster(false);
                elements.posterMaterials[0].map = new THREE.CanvasTexture(canvas);
                elements.posterMaterials[0].needsUpdate = true;
            }
            if (elements.posterMaterials[1]) {
                const canvas = this.drawStickmanPoster('normal');
                elements.posterMaterials[1].map = new THREE.CanvasTexture(canvas);
                elements.posterMaterials[1].needsUpdate = true;
            }
            if (elements.posterMaterials[2]) {
                const canvas = this.drawTravelPoster('normal');
                // restore default standard material in case mirror was active
                if (elements.posters[2]) {
                    elements.posters[2].material = elements.posterMaterials[2];
                }
                elements.posterMaterials[2].map = new THREE.CanvasTexture(canvas);
                elements.posterMaterials[2].needsUpdate = true;
            }
            if (elements.posterMaterials[3]) {
                const canvas = this.drawRestaurantPoster('normal');
                elements.posterMaterials[3].map = new THREE.CanvasTexture(canvas);
                elements.posterMaterials[3].needsUpdate = true;
            }
        }

        // 6. Falling poster state
        elements.thirdPosterState = 'none';
        elements.postersShrinkingStarted = false;

        // 8. Blue handprint clean
        if (elements.blueHandprint) {
            scene.remove(elements.blueHandprint);
            elements.blueHandprint = null;
        }
        elements.blueHandState = 'none';

        // 10. Door scales & positions
        elements.rightDoors.forEach((d, idx) => {
            d.scale.set(1.0, 1.0, 1.0);
            d.position.y = 0;
            d.rotation.set(0, -Math.PI / 2, 0);
            d.visible = true;
            
            // Remove cloned handle (Anomaly 37)
            if (d.userData.clonedHandle) {
                d.remove(d.userData.clonedHandle);
                d.userData.clonedHandle = null;
            }
            
            // Spin reset
            const handle = d.getObjectByName("handle");
            if (handle) handle.rotation.set(0, 0, 0);
        });

        // 11. Banging door state
        elements.bangingDoorState = 'none';

        // 13. Ceiling height reset
        if (elements.ceiling) {
            elements.ceiling.position.y = 3.0;
        }

        // 14. Shadow figure clean
        if (elements.shadowFigure) {
            scene.remove(elements.shadowFigure);
            elements.shadowFigure = null;
        }
        elements.shadowState = 'none';

        // 16/17/19/20/21. Exit sign resets
        if (elements.exitSign) {
            elements.exitSign.visible = true;
            elements.exitSign.rotation.set(0, 0, 0);
            elements.exitSign.position.y = 1.8;
        }
        if (elements.exitSignMaterial) {
            const canvas = this.drawExitSign(exitNumber, 'normal');
            elements.exitSignMaterial.map = new THREE.CanvasTexture(canvas);
            elements.exitSignMaterial.needsUpdate = true;
        }

        // 22/23/25/26/63/66. Hydrants reset
        if (elements.hydrant) {
            elements.hydrant.visible = true;
            elements.hydrant.scale.set(1.0, 1.0, 1.0);
            elements.hydrant.rotation.set(0, 0, 0);
            elements.hydrant.position.y = 0;
            if (elements.hydrantParts) {
                elements.hydrantParts.forEach(p => p.color.setHex(0xcc1111)); // red
            }
        }
        if (elements.clonedHydrant) {
            scene.remove(elements.clonedHydrant);
            elements.clonedHydrant = null;
        }

        // 24. Water puddle cleanup
        if (elements.waterPuddle) {
            scene.remove(elements.waterPuddle);
            elements.waterPuddle = null;
        }

        // 36. Lights reset
        elements.lights.forEach((l, idx) => {
            l.color.setHex(0xffffff);
            l.intensity = 0.5;
            // Restore position for red alert
            if (l.userData.originalZ !== undefined) {
                l.position.set(0, 2.9, l.userData.originalZ);
            }
        });
        scene.background = new THREE.Color(0x050508);
        if (scene && scene.fog) {
            scene.fog.density = 0.05; // 포그 밀도 복구
            scene.fog.color.setHex(0x050508); // 포그 색상 복구
        }

        // 38. Keyhole red light clean
        if (elements.keyholeRedLight) {
            scene.remove(elements.keyholeRedLight);
            elements.keyholeRedLight = null;
        }
        elements.keyholeState = 'none';

        // 40. Void window clean
        if (elements.voidWindow) {
            scene.remove(elements.voidWindow);
            elements.voidWindow = null;
        }

        // 41. Right wall reset
        if (elements.rightWall) {
            elements.rightWall.material.color.setHex(0xaaaaaa);
        }

        // 42. Tilted wall reset
        if (elements.leftWall && elements.rightWall) {
            elements.leftWall.rotation.set(0, Math.PI / 2, 0);
            elements.rightWall.rotation.set(0, -Math.PI / 2, 0);
        }

        // 43. Brick wall block clean
        if (elements.brickWallBlock) {
            scene.remove(elements.brickWallBlock);
            elements.brickWallBlock = null;
        }

        // 44/45/48/49. Floor reset
        if (elements.floorMaterial) {
            const canvas = this.drawWoodFloor();
            const length = (this.activeId === 15) ? 167 : 30;
            elements.floorMaterial.map = new THREE.CanvasTexture(canvas);
            elements.floorMaterial.map.wrapS = THREE.RepeatWrapping;
            elements.floorMaterial.map.wrapT = THREE.RepeatWrapping;
            elements.floorMaterial.map.repeat.set(4, length);
            elements.floorMaterial.needsUpdate = true;
        }

        // 47. Ceiling fans cleanup
        if (elements.ceilingFans) {
            elements.ceilingFans.forEach(f => scene.remove(f));
            elements.ceilingFans = null;
        }

        // 50. Bottomless pit cleanup
        if (elements.voidPit) {
            scene.remove(elements.voidPit);
            elements.voidPit = null;
        }
        elements.pitState = 'none';

        // Flashlight color reset
        if (elements.flashlight) {
            elements.flashlight.color.setHex(0xffffff);
            elements.flashlight.intensity = elements.flashlightOn ? 1.5 : 0;
        }

        // 62. wind flapping reset
        elements.postersFlapping = false;

        // 64. Door text scales
        if (elements.doorFrontTextMesh) elements.doorFrontTextMesh.scale.set(1, 1, 1);
        if (elements.doorBackTextMesh) elements.doorBackTextMesh.scale.set(1, 1, 1);

        // 67. Red alert state reset
        elements.redAlertState = 'none';
    }
};

window.AnomalySystem = AnomalySystem;
