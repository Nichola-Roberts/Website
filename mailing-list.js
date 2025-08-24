// Mailing List Modal Functionality
class MailingList {
    constructor() {
        this.modal = document.getElementById('mailingListModal');
        this.form = document.getElementById('mailingListForm');
        this.emailInput = document.getElementById('emailInput');
        this.subscribeBtn = document.getElementById('subscribeBtn');
        this.unsubscribeBtn = document.getElementById('unsubscribeBtn');
        this.message = document.getElementById('mailingListMessage');
        this.closeBtn = document.getElementById('mailingListClose');
        
        this.init();
    }
    
    init() {
        // Handle mailing list link clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mailing-list-link')) {
                e.preventDefault();
                this.openModal();
            }
        });
        
        // Handle form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.subscribe();
        });
        
        // Handle unsubscribe button
        this.unsubscribeBtn.addEventListener('click', () => {
            this.unsubscribe();
        });
        
        // Handle close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Close modal on clicking outside the modal content
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        this.modal.classList.add('active');
        document.body.classList.add('modal-open');
        this.emailInput.focus();
    }
    
    closeModal() {
        this.modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.clearMessage();
        this.form.reset();
    }
    
    async subscribe() {
        const email = this.emailInput.value.trim();
        
        if (!email) {
            this.showMessage('Please enter your email address.', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const response = await fetch('/.netlify/functions/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('Successfully subscribed! Thank you for joining our mailing list.', 'success');
                this.form.reset();
            } else {
                if (response.status === 409) {
                    this.showMessage('This email is already subscribed to our mailing list.', 'info');
                } else {
                    this.showMessage(data.error || 'Failed to subscribe. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Subscription error:', error);
            this.showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async unsubscribe() {
        const email = this.emailInput.value.trim();
        
        if (!email) {
            this.showMessage('Please enter your email address to unsubscribe.', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }
        
        this.setLoading(true, 'unsubscribe');
        
        try {
            const response = await fetch('/.netlify/functions/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('Successfully unsubscribed. You will no longer receive emails from us.', 'success');
                this.form.reset();
            } else {
                if (response.status === 404) {
                    this.showMessage('This email was not found in our mailing list.', 'info');
                } else {
                    this.showMessage(data.error || 'Failed to unsubscribe. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Unsubscribe error:', error);
            this.showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.setLoading(false, 'unsubscribe');
        }
    }
    
    setLoading(loading, button = 'subscribe') {
        const btn = button === 'subscribe' ? this.subscribeBtn : this.unsubscribeBtn;
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        if (loading) {
            btn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
        } else {
            btn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }
    
    showMessage(text, type = 'info') {
        this.message.textContent = text;
        this.message.className = `mailing-list-message ${type}`;
        this.message.style.display = 'block';
    }
    
    clearMessage() {
        this.message.textContent = '';
        this.message.className = 'mailing-list-message';
        this.message.style.display = 'none';
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize mailing list functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MailingList();
});