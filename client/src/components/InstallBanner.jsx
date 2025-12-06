import React, { useState, useEffect } from 'react';
import './InstallBanner.css';

/**
 * Install Banner Component
 * Shows platform-specific instructions for adding to home screen
 * Supports native install prompt on Android/Windows Chrome
 */
export function InstallBanner() {
    const [show, setShow] = useState(false);
    const [platform, setPlatform] = useState('unknown');
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // Check if already dismissed
        const dismissed = localStorage.getItem('install_banner_dismissed');
        if (dismissed) return;

        // Detect platform
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isAndroid = /Android/.test(ua);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        // Only show if mobile and not already installed
        if (!isStandalone && (isIOS || isAndroid)) {
            setPlatform(isIOS ? 'ios' : 'android');
            setShow(true);
        }

        // Listen for PWA install prompt (Android/Windows Chrome)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShow(true);
            setPlatform('pwa'); // Native install available
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('install_banner_dismissed', 'true');
        setShow(false);
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show native install prompt
        deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the install prompt`);

        // Clear the prompt
        setDeferredPrompt(null);
        setShow(false);
        localStorage.setItem('install_banner_dismissed', 'true');
    };

    if (!show) return null;

    return (
        <div className="install-banner">
            <button className="install-close" onClick={handleDismiss}>×</button>

            <div className="install-content">
                <div className="install-icon">📱</div>
                <div className="install-text">
                    <h3>Install FreeJoy</h3>
                    <p className="install-subtitle">For better fullscreen experience</p>

                    {/* Native PWA Install (Android/Windows Chrome) */}
                    {platform === 'pwa' && deferredPrompt && (
                        <button className="install-button" onClick={handleInstallClick}>
                            📥 Install App
                        </button>
                    )}

                    {/* iOS Manual Instructions */}
                    {platform === 'ios' && (
                        <ol className="install-steps">
                            <li>Tap the <strong>Share</strong> button <span className="ios-icon">⎋</span></li>
                            <li>Scroll and tap <strong>"Add to Home Screen"</strong></li>
                            <li>Tap <strong>"Add"</strong> to confirm</li>
                        </ol>
                    )}

                    {/* Android Manual Instructions (fallback if no PWA prompt) */}
                    {platform === 'android' && !deferredPrompt && (
                        <ol className="install-steps">
                            <li>Tap the <strong>Menu</strong> button <span className="android-icon">⋮</span></li>
                            <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                            <li>Tap <strong>"Add"</strong> to confirm</li>
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}
