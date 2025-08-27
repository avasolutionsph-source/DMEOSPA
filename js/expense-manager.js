// Expense Manager Module
(function() {
    'use strict';
    
    class ExpenseManager {
    constructor() {
        // Get StateManager from window (it's a singleton instance, not a class)
        this.stateManager = window.StateManager || null;
        if (!this.stateManager) {
            console.warn('StateManager not available, using local storage fallback');
        }
        this.receiptImageData = null;
        this.currentStream = null;
        this.initializeExpenseListeners();
    }

    initializeExpenseListeners() {
        // Add any necessary listeners here
        console.log('💰 Expense manager initialized');
        
        // Set up global functions for modal interactions
        window.handleImageUpload = (input) => this.handleImageUpload(input);
        window.capturePhoto = () => this.capturePhoto();
        window.openCameraCapture = () => this.openCameraCapture();
        window.editExpense = (id) => this.editExpense(id);
        window.deleteExpense = (id) => this.deleteExpense(id);
        window.viewReceipt = (id) => this.viewReceipt(id);
    }

    async showExpenseModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.cssText = 'display: flex !important; align-items: center !important; justify-content: center !important;';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-receipt"></i> Add New Expense</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <form id="expense-form">
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label for="expense-category" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                    Category <span class="required" style="color: #ef4444;">*</span>
                                </label>
                                <select id="expense-category" class="form-control" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                                    <option value="">Select Category</option>
                                    <option value="Supplies">Supplies</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Salaries">Salaries</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="expense-amount" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                    Amount <span class="required" style="color: #ef4444;">*</span>
                                </label>
                                <div class="input-group" style="display: flex; align-items: center;">
                                    <span class="input-addon" style="padding: 0.75rem 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-right: none; border-radius: 8px 0 0 8px; color: #6b7280;">₱</span>
                                    <input type="number" id="expense-amount" class="form-control" placeholder="0.00" step="0.01" required style="flex: 1; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0 8px 8px 0; font-size: 1rem;">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label for="expense-description" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                Description <span class="required" style="color: #ef4444;">*</span>
                            </label>
                            <input type="text" id="expense-description" class="form-control" placeholder="What was this expense for?" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                        </div>
                        
                        <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label for="expense-date" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                    Date <span class="required" style="color: #ef4444;">*</span>
                                </label>
                                <input type="date" id="expense-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                            </div>
                            <div class="form-group">
                                <label for="expense-vendor" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">
                                    Vendor/Supplier
                                </label>
                                <input type="text" id="expense-vendor" class="form-control" placeholder="Optional" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem;">
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Receipt Photo</label>
                            <div class="receipt-upload-container" style="border: 2px dashed #e5e7eb; border-radius: 12px; padding: 1.5rem; text-align: center; background: #f9fafb;">
                                <div class="upload-buttons" style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem;">
                                    <button type="button" class="btn btn-secondary" onclick="if(window.expenseManager) window.expenseManager.openCameraCapture()" style="
                                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        padding: 0.75rem 1.5rem;
                                        font-size: 1rem;
                                        font-weight: 600;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 0.5rem;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                        <i class="fas fa-camera"></i> Take Photo
                                    </button>
                                    <label class="btn btn-primary" style="
                                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        padding: 0.75rem 1.5rem;
                                        font-size: 1rem;
                                        font-weight: 600;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 0.5rem;
                                        transition: all 0.2s ease;
                                    " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                        <i class="fas fa-upload"></i> Upload File
                                        <input type="file" id="expense-receipt" accept="image/*" onchange="if(window.expenseManager) window.expenseManager.handleImageUpload(this)" style="display: none;">
                                    </label>
                                </div>
                                <div id="receipt-preview" class="receipt-preview"></div>
                                <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                                    <i class="fas fa-info-circle"></i> Attach a photo of your receipt for record keeping
                                </p>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label for="expense-notes" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Notes</label>
                            <textarea id="expense-notes" class="form-control" rows="3" placeholder="Additional notes (optional)" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 1rem; resize: vertical;"></textarea>
                        </div>
                        
                        <div class="form-actions" style="display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="
                                background: #f3f4f6;
                                color: #374151;
                                border: 1px solid #e5e7eb;
                                border-radius: 8px;
                                padding: 0.75rem 1.5rem;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary" style="
                                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                padding: 0.75rem 1.5rem;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-save"></i> Save Expense
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveExpense();
            modal.remove();
        });
    }

    async saveExpense() {
        const category = document.getElementById('expense-category').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const description = document.getElementById('expense-description').value;
        const date = document.getElementById('expense-date').value;
        
        const expense = {
            id: Date.now(),
            category,
            amount,
            description,
            date,
            receipt: this.receiptImageData,
            timestamp: new Date().toISOString()
        };
        
        // Add to state
        const expenses = this.getExpenses();
        expenses.push(expense);
        this.saveExpenses(expenses);
        
        // Reset receipt data
        this.receiptImageData = null;
        
        console.log('💰 Expense saved:', expense);
        
        if (window.showSuccess) {
            window.showSuccess('Expense added successfully!');
        }
        
        // Refresh any expense displays
        if (window.app && window.app.currentFeature === 'expenses') {
            window.app.loadFeature('expenses');
        }
    }

    handleImageUpload(input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.receiptImageData = e.target.result;
            this.displayImagePreview(this.receiptImageData);
        };
        reader.readAsDataURL(file);
    }

    displayImagePreview(imageData) {
        const preview = document.getElementById('receipt-preview');
        if (!preview) return;
        
        preview.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img src="${imageData}" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #e5e7eb;">
                <button onclick="this.parentElement.remove(); expenseManager.receiptImageData = null;" 
                    style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; 
                    border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">
                    ×
                </button>
            </div>
        `;
    }

    async openCameraCapture() {
        console.log('📸 Opening camera capture...');
        
        // Detect if desktop browser (better to use file input on desktop)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
        
        if (!isMobile) {
            console.log('Desktop browser detected. Using file input for better experience.');
            this.fallbackToCameraInput();
            return;
        }
        
        // Check if we're in a secure context (HTTPS or localhost)
        const isSecureContext = window.isSecureContext;
        const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
        
        if (!isSecureContext && !isLocalhost) {
            console.warn('Camera requires HTTPS. Using file input.');
            this.fallbackToCameraInput();
            return;
        }
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log('getUserMedia not supported. Using file input.');
            this.fallbackToCameraInput();
            return;
        }
        
        try {
            // Check camera permission first if available
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permission = await navigator.permissions.query({ name: 'camera' });
                    if (permission.state === 'denied') {
                        console.log('Camera permission already denied. Using file input.');
                        this.fallbackToCameraInput();
                        return;
                    }
                } catch (e) {
                    // Permission API not supported, continue
                }
            }
            
            // Try to access camera with environment facing preference
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false 
            });
            
            // Create video element to show camera stream
            this.showCameraPreview(stream);
            
        } catch (error) {
            console.error('Camera access denied or blocked:', error.name, error.message);
            
            // Check if it's a permission error
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                // Permission denied - use file input directly
                console.log('Camera permission denied. Using file input.');
                this.fallbackToCameraInput();
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                // No camera found
                console.log('No camera found. Using file input.');
                this.fallbackToCameraInput();
            } else {
                // Try once more with basic constraints
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: true,
                        audio: false 
                    });
                    this.showCameraPreview(stream);
                } catch (fallbackError) {
                    console.error('Camera access failed completely:', fallbackError);
                    this.fallbackToCameraInput();
                }
            }
        }
    }

    showCameraPreview(stream) {
        // Create modal for camera preview
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.cssText = 'display: flex !important; align-items: center; justify-content: center; z-index: 10000;';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; width: 90%; background: white; border-radius: 12px; overflow: hidden;">
                <div class="modal-header" style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;"><i class="fas fa-camera"></i> Take Photo</h3>
                    <button id="closeCameraBtn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1rem; text-align: center;">
                    <video id="cameraVideo" autoplay playsinline style="width: 100%; max-width: 500px; border-radius: 8px; background: #000;"></video>
                    <canvas id="cameraCanvas" style="display: none;"></canvas>
                    <img id="capturedPhoto" style="display: none; width: 100%; max-width: 500px; border-radius: 8px;">
                    
                    <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
                        <button id="captureBtn" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px;
                            padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;
                            cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-camera"></i> Capture
                        </button>
                        <button id="retakeBtn" style="
                            display: none;
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white; border: none; border-radius: 8px;
                            padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;
                            cursor: pointer; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-redo"></i> Retake
                        </button>
                        <button id="usePhotoBtn" style="
                            display: none;
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white; border: none; border-radius: 8px;
                            padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;
                            cursor: pointer; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-check"></i> Use Photo
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup video stream
        const video = modal.querySelector('#cameraVideo');
        const canvas = modal.querySelector('#cameraCanvas');
        const photo = modal.querySelector('#capturedPhoto');
        const captureBtn = modal.querySelector('#captureBtn');
        const retakeBtn = modal.querySelector('#retakeBtn');
        const usePhotoBtn = modal.querySelector('#usePhotoBtn');
        const closeBtn = modal.querySelector('#closeCameraBtn');
        
        video.srcObject = stream;
        
        // Store stream for cleanup
        this.currentStream = stream;
        
        // Capture photo
        captureBtn.onclick = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Convert to data URL
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Show captured photo
            photo.src = imageData;
            photo.style.display = 'block';
            video.style.display = 'none';
            captureBtn.style.display = 'none';
            retakeBtn.style.display = 'flex';
            usePhotoBtn.style.display = 'flex';
        };
        
        // Retake photo
        retakeBtn.onclick = () => {
            photo.style.display = 'none';
            video.style.display = 'block';
            captureBtn.style.display = 'flex';
            retakeBtn.style.display = 'none';
            usePhotoBtn.style.display = 'none';
        };
        
        // Use photo
        usePhotoBtn.onclick = () => {
            this.receiptImageData = photo.src;
            this.displayImagePreview(this.receiptImageData);
            this.closeCameraModal(modal, stream);
            if (window.showSuccess) {
                window.showSuccess('Photo captured successfully!');
            }
        };
        
        // Close modal
        closeBtn.onclick = () => {
            this.closeCameraModal(modal, stream);
        };
    }
    
    closeCameraModal(modal, stream) {
        // Stop all tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        // Remove modal
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        this.currentStream = null;
    }

    async tryMultipleCameraConfigurations(device = null) {
        const configurations = [
            // Config 1: Specific device ID (if provided)
            device ? {
                video: {
                    deviceId: { exact: device.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            } : null,
            // Config 2: Environment facing (back camera)
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            },
            // Config 3: Any camera with resolution
            {
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                },
                audio: false
            },
            // Config 4: Simple video true
            {
                video: true,
                audio: false
            },
            // Config 5: User facing (front camera) as last resort
            {
                video: {
                    facingMode: 'user'
                },
                audio: false
            }
        ].filter(config => config !== null);

        let stream = null;
        let lastError = null;

        for (let i = 0; i < configurations.length; i++) {
            try {
                console.log(`🔧 Trying camera configuration ${i + 1}/${configurations.length}...`);
                stream = await navigator.mediaDevices.getUserMedia(configurations[i]);
                
                if (stream) {
                    console.log(`✅ Camera accessed with configuration ${i + 1}`);
                    
                    // Check if stream has video tracks
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        console.log('📹 Video track found:', videoTracks[0].getSettings());
                        this.showCameraModal(stream);
                        return;
                    } else {
                        console.warn('No video tracks in stream');
                        stream.getTracks().forEach(track => track.stop());
                    }
                }
            } catch (error) {
                lastError = error;
                console.log(`Configuration ${i + 1} failed:`, error.name, error.message);
            }
        }

        // All configurations failed
        throw lastError || new Error('Unable to access camera with any configuration');
    }

    async showCameraSelectionModal(videoDevices) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.style.zIndex = '10001';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-video"></i> Select Camera</h2>
                        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <p style="margin-bottom: 1rem;">Multiple cameras detected. Select which one to use:</p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${videoDevices.map((device, index) => `
                                <button onclick="expenseManager.selectCamera('${device.deviceId}')" style="
                                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                    color: white; border: none; border-radius: 8px; padding: 1rem;
                                    font-size: 1rem; cursor: pointer; text-align: left;
                                    display: flex; align-items: center; gap: 0.75rem;
                                    transition: all 0.2s ease;
                                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                    <i class="fas fa-camera" style="font-size: 1.25rem;"></i>
                                    <div>
                                        <div style="font-weight: 600;">
                                            ${device.label || `Camera ${index + 1}`}
                                        </div>
                                        <div style="font-size: 0.85rem; opacity: 0.9;">
                                            ${index === 0 ? '(Usually front camera)' : index === 1 ? '(Usually back camera)' : ''}
                                        </div>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                        <div style="margin-top: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 8px;">
                            <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                                <i class="fas fa-info-circle"></i> 
                                If camera doesn't work, try a different one from the list.
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Store modal reference for removal
            this.cameraSelectionModal = modal;
            
            resolve();
        });
    }

    async selectCamera(deviceId) {
        // Remove selection modal
        if (this.cameraSelectionModal) {
            this.cameraSelectionModal.remove();
            this.cameraSelectionModal = null;
        }
        
        try {
            const device = { deviceId };
            await this.tryMultipleCameraConfigurations(device);
        } catch (error) {
            console.error('Failed to access selected camera:', error);
            window.showError(`Failed to access selected camera: ${error.message}`);
            this.fallbackToCameraInput();
        }
    }

    showCameraOptionsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-camera"></i> Camera Access</h2>
                    <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p style="color: #374151; font-weight: 600;">Secure Connection Required</p>
                    </div>
                    
                    <p style="margin-bottom: 1rem; color: #6b7280;">
                        Camera access requires a secure HTTPS connection for privacy protection.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button onclick="expenseManager.fallbackToCameraInput()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-mobile-alt"></i> Use Mobile Camera
                        </button>
                        
                        <button onclick="document.getElementById('expense-receipt').click(); this.closest('.modal').remove()" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; font-weight: 600; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-upload"></i> Choose from Files
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    fallbackToCameraInput() {
        console.log('📷 Opening file selector for receipt capture...');
        
        // Create input element for camera/file capture
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Detect if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
        
        if (isMobile) {
            // On mobile, use capture attribute to trigger camera
            input.setAttribute('capture', 'environment'); // Use back camera
            console.log('Mobile device detected - camera should open directly');
        } else {
            // On desktop, allow file selection
            console.log('Desktop device - select an image file or use webcam software to capture');
        }
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check file size (limit to 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    if (window.showError) {
                        window.showError('Image too large. Please use an image under 10MB.');
                    }
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.receiptImageData = event.target.result;
                    this.displayImagePreview(this.receiptImageData);
                    console.log('✅ Photo captured/uploaded successfully');
                    if (window.showSuccess) {
                        window.showSuccess('Receipt image added successfully!');
                    }
                };
                reader.onerror = () => {
                    console.error('Error reading file');
                    if (window.showError) {
                        window.showError('Error reading image file. Please try again.');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        
        // Add input to DOM temporarily (required for some browsers)
        input.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
        document.body.appendChild(input);
        
        // Trigger the file/camera dialog
        try {
            input.click();
        } catch (e) {
            console.error('Could not trigger file input:', e);
        }
        
        // Clean up after a delay
        setTimeout(() => {
            if (input.parentNode) {
                document.body.removeChild(input);
            }
        }, 3000);
    }

    showCameraModal(stream) {
        // Store the stream for later cleanup
        this.currentStream = stream;
        
        // Create camera modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.style.zIndex = '10000';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-camera"></i> Take Photo</h2>
                    <button class="close-btn" onclick="expenseManager.closeCameraModal()">×</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 1rem;">
                    <video id="cameraVideo" autoplay playsinline muted style="
                        width: 100%;
                        max-width: 500px;
                        border-radius: 8px;
                        background: #000;
                        display: block;
                        margin: 0 auto 1rem;
                    "></video>
                    <canvas id="cameraCanvas" style="display: none;"></canvas>
                    <div id="capturedImage" style="display: none;">
                        <img id="capturedPhoto" style="
                            width: 100%;
                            max-width: 500px;
                            border-radius: 8px;
                            margin-bottom: 1rem;
                        " />
                    </div>
                    <div id="cameraStatus" style="margin-bottom: 1rem; color: #10b981; font-weight: 600;">
                        <i class="fas fa-check-circle"></i> Camera Ready
                    </div>
                    <div id="cameraControls" style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="expenseManager.capturePhoto()" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-camera"></i> Capture Photo
                        </button>
                        <button id="retakeBtn" onclick="expenseManager.retakePhoto()" style="
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; cursor: pointer; display: none; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-redo"></i> Retake
                        </button>
                        <button id="usePhotoBtn" onclick="expenseManager.usePhoto()" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                            font-size: 1rem; cursor: pointer; display: none; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-check"></i> Use Photo
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.cameraModal = modal;
        
        // Attach stream to video element
        const video = document.getElementById('cameraVideo');
        if (video && stream) {
            video.srcObject = stream;
            
            // Ensure video plays
            video.onloadedmetadata = () => {
                video.play().catch(err => {
                    console.error('Video play failed:', err);
                    document.getElementById('cameraStatus').innerHTML = 
                        '<i class="fas fa-exclamation-triangle"></i> Click to start video';
                    video.onclick = () => video.play();
                });
            };
        }
    }

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        const capturedImage = document.getElementById('capturedImage');
        const capturedPhoto = document.getElementById('capturedPhoto');
        
        if (!video || !canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Hide video, show captured image
        video.style.display = 'none';
        capturedImage.style.display = 'block';
        capturedPhoto.src = imageData;
        
        // Update buttons
        document.querySelector('[onclick="expenseManager.capturePhoto()"]').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'flex';
        document.getElementById('usePhotoBtn').style.display = 'flex';
        document.getElementById('cameraStatus').innerHTML = 
            '<i class="fas fa-image"></i> Photo Captured';
        
        // Store temporarily
        this.tempImageData = imageData;
    }

    retakePhoto() {
        const video = document.getElementById('cameraVideo');
        const capturedImage = document.getElementById('capturedImage');
        
        // Show video, hide captured image
        video.style.display = 'block';
        capturedImage.style.display = 'none';
        
        // Update buttons
        document.querySelector('[onclick="expenseManager.capturePhoto()"]').style.display = 'flex';
        document.getElementById('retakeBtn').style.display = 'none';
        document.getElementById('usePhotoBtn').style.display = 'none';
        document.getElementById('cameraStatus').innerHTML = 
            '<i class="fas fa-check-circle"></i> Camera Ready';
        
        // Clear temp data
        this.tempImageData = null;
    }

    usePhoto() {
        if (this.tempImageData) {
            this.receiptImageData = this.tempImageData;
            this.displayImagePreview(this.receiptImageData);
            console.log('✅ Photo saved successfully');
            if (window.showSuccess) {
                window.showSuccess('Photo captured successfully!');
            }
        }
        
        this.closeCameraModal();
    }

    closeCameraModal() {
        // Stop camera stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        // Remove modal
        if (this.cameraModal) {
            this.cameraModal.remove();
            this.cameraModal = null;
        }
        
        // Clear temp data
        this.tempImageData = null;
    }

    getExpenses() {
        if (this.stateManager) {
            return this.stateManager.getState('expenses') || [];
        }
        // Fallback to localStorage
        const stored = localStorage.getItem('expenses');
        return stored ? JSON.parse(stored) : [];
    }
    
    saveExpenses(expenses) {
        if (this.stateManager) {
            this.stateManager.setState('expenses', expenses);
        } else {
            localStorage.setItem('expenses', JSON.stringify(expenses));
        }
    }
    
    async loadExpenses() {
        const expenses = this.getExpenses();
        
        // Update dashboard stats if they exist
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthExpenses = expenses.filter(exp => {
            const date = new Date(exp.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Update stat cards if they exist
        const totalExpensesEl = document.getElementById('total-expenses');
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `₱${totalSpent.toFixed(2)}`;
        }
        
        const thisMonthEl = document.getElementById('this-month-expenses');
        if (thisMonthEl) {
            thisMonthEl.textContent = `₱${thisMonthTotal.toFixed(2)}`;
        }
        
        const countEl = document.getElementById('total-expense-count');
        if (countEl) {
            countEl.textContent = expenses.length;
        }
        
        // Find the expenses list container
        let content = document.getElementById('expenses-list');
        
        // If not found, try main-content
        if (!content) {
            content = document.getElementById('main-content');
        }
        
        if (!content) return;
        
        // Update expenses list content
        content.innerHTML = expenses.length === 0 ? `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #64748b;">
                <i class="fas fa-receipt" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No Expenses Recorded</h3>
                <p>Start tracking your business expenses by adding your first expense record</p>
                <button onclick="if(window.expenseManager) window.expenseManager.showExpenseModal();" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem;
                    font-weight: 600; cursor: pointer; margin-top: 1rem;
                ">
                    <i class="fas fa-plus"></i> Add Your First Expense
                </button>
            </div>
        ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${expenses.map(expense => `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        padding: 1.5rem;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                    " onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #4f46e5;
                            font-size: 1.25rem;
                        ">
                            ${this.getCategoryIcon(expense.category)}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">${expense.description}</div>
                            <div style="font-size: 0.875rem; color: #64748b;">${expense.category} • ${new Date(expense.date).toLocaleDateString()}</div>
                        </div>
                        <div style="font-weight: 700; font-size: 1.25rem; color: #1e293b;">₱${expense.amount.toFixed(2)}</div>
                        <div style="display: flex; gap: 0.5rem;">
                            ${expense.receipt ? `
                                <button onclick="if(window.expenseManager) window.expenseManager.viewReceipt(${expense.id});" style="
                                    background: #f1f5f9; color: #475569; border: none; border-radius: 8px;
                                    width: 36px; height: 36px; cursor: pointer; display: flex;
                                    align-items: center; justify-content: center; transition: all 0.2s ease;
                                " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" title="View Receipt">
                                    <i class="fas fa-image"></i>
                                </button>
                            ` : ''}
                            <button onclick="if(window.expenseManager) window.expenseManager.editExpense(${expense.id});" style="
                                background: #f1f5f9; color: #475569; border: none; border-radius: 8px;
                                width: 36px; height: 36px; cursor: pointer; display: flex;
                                align-items: center; justify-content: center; transition: all 0.2s ease;
                            " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="if(window.expenseManager) window.expenseManager.deleteExpense(${expense.id});" style="
                                background: #fee2e2; color: #dc2626; border: none; border-radius: 8px;
                                width: 36px; height: 36px; cursor: pointer; display: flex;
                                align-items: center; justify-content: center; transition: all 0.2s ease;
                            " onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).reverse().join('')}
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            'Food & Dining': '<i class="fas fa-utensils"></i>',
            'Transportation': '<i class="fas fa-car"></i>',
            'Shopping': '<i class="fas fa-shopping-bag"></i>',
            'Entertainment': '<i class="fas fa-film"></i>',
            'Bills & Utilities': '<i class="fas fa-file-invoice"></i>',
            'Healthcare': '<i class="fas fa-heartbeat"></i>',
            'Education': '<i class="fas fa-graduation-cap"></i>',
            'Travel': '<i class="fas fa-plane"></i>',
            'Other': '<i class="fas fa-ellipsis-h"></i>'
        };
        return icons[category] || icons['Other'];
    }

    editExpense(id) {
        // Implementation for editing expense
        console.log('Edit expense:', id);
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            const expenses = this.getExpenses();
            const filtered = expenses.filter(exp => exp.id !== id);
            this.saveExpenses(filtered);
            
            if (window.showSuccess) {
                window.showSuccess('Expense deleted successfully');
            }
            
            // Reload expenses
            this.loadExpenses();
        }
    }

    viewReceipt(id) {
        const expenses = this.getExpenses();
        const expense = expenses.find(exp => exp.id === id);
        
        if (!expense || !expense.receipt) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-image"></i> Receipt for ${expense.description}</h2>
                    <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <img src="${expense.receipt}" style="max-width: 100%; border-radius: 8px;">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}
    
    // Create and expose singleton instance
    const expenseManager = new ExpenseManager();
    window.expenseManager = expenseManager;
    window.ExpenseManager = ExpenseManager;
    
    // Also expose to window for debugging
    console.log('💰 Expense Manager loaded and available as window.expenseManager');
    
})();