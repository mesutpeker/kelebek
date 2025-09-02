// Ana Uygulama - Kelebek Dağıtım Sistemi

// Global değişkenler
let debugMode = false;
let classesByName = {};

// Debug log fonksiyonu
function debugLog(message, data = null) {
    if (debugMode) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
}

// Harf birleştirme fonksiyonu (PDF'den gelen bozuk karakterleri düzelt)
function mergeLetters(text) {
    if (!text) return '';
    
    // Türkçe karakter düzeltmeleri
    const corrections = {
        'ı': 'ı', 'i': 'i', 'İ': 'İ', 'I': 'I',
        'ğ': 'ğ', 'Ğ': 'Ğ',
        'ü': 'ü', 'Ü': 'Ü',
        'ş': 'ş', 'Ş': 'Ş',
        'ö': 'ö', 'Ö': 'Ö',
        'ç': 'ç', 'Ç': 'Ç'
    };
    
    let corrected = text;
    Object.entries(corrections).forEach(([wrong, correct]) => {
        corrected = corrected.replace(new RegExp(wrong, 'g'), correct);
    });
    
    return corrected.trim();
}

// PDF.js worker ayarları
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kelebek Dağıtım Sistemi başlatılıyor...');
    
    // PDF işleme butonunu ayarla
    const processPdfBtn = document.getElementById('processPdfBtn');
    const pdfFileInput = document.getElementById('pdfFile');
    
    if (processPdfBtn && pdfFileInput) {
        processPdfBtn.addEventListener('click', handlePdfProcessing);
        
        // Dosya seçildiğinde otomatik işleme seçeneği
        pdfFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                processPdfBtn.disabled = false;
                processPdfBtn.innerHTML = '<i class="bi bi-gear"></i> PDF\'i İşle';
            }
        });
    }
    
    // Tab değişikliklerini dinle
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
        button.addEventListener('shown.bs.tab', function(e) {
            const targetTab = e.target.getAttribute('data-bs-target');
            console.log(`Tab değiştirildi: ${targetTab}`);
            
            // Tab'a göre özel işlemler
            if (targetTab === '#classrooms') {
                // Derslik yönetimi sekmesi açıldığında
                if (classroomManager) {
                    classroomManager.displayClassrooms();
                }
            } else if (targetTab === '#distribution') {
                // Dağıtım sekmesi açıldığında seçim listelerini güncelle
                updateSelectionLists();
            }
        });
    });
    
    // Başlangıç durumunu ayarla
    updateSelectionLists();
    
    console.log('Kelebek Dağıtım Sistemi hazır!');
});

// PDF işleme fonksiyonu
async function handlePdfProcessing() {
    const fileInput = document.getElementById('pdfFile');
    const statusDiv = document.getElementById('processing-status');
    const processBtn = document.getElementById('processPdfBtn');
    
    if (!fileInput.files.length) {
        showStatus('Lütfen bir PDF dosyası seçin.', 'danger');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Dosya türü kontrolü
    if (file.type !== 'application/pdf') {
        showStatus('Lütfen geçerli bir PDF dosyası seçin.', 'danger');
        return;
    }
    
    try {
        // İşleme başladığını göster
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> İşleniyor...';
        showStatus('PDF dosyası okunuyor...', 'info');
        
        // PDF'i oku
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        showStatus(`PDF yüklendi. ${pdf.numPages} sayfa işleniyor...`, 'info');
        
        // Sınıf bilgilerini çıkar
        const classes = await extractClassInfo(pdf);
        
        if (Object.keys(classes).length === 0) {
            showStatus('PDF\'de öğrenci bilgisi bulunamadı. Lütfen dosyayı kontrol edin.', 'danger');
            return;
        }
        
        // Sonuçları göster
        classesByName = classes;
        displayClassesAndStudents(classes);
        
        const totalStudents = Object.values(classes).reduce((sum, students) => sum + students.length, 0);
        showStatus(`Başarılı! ${Object.keys(classes).length} sınıf, ${totalStudents} öğrenci işlendi.`, 'success');
        
        // Dağıtım sekmesindeki seçim listelerini güncelle
        updateSelectionLists();
        
    } catch (error) {
        console.error('PDF işleme hatası:', error);
        showStatus(`Hata: ${error.message}`, 'danger');
    } finally {
        // Butonu eski haline getir
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="bi bi-gear"></i> PDF\'i İşle';
    }
}

// Durum mesajı göster
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('processing-status');
    if (!statusDiv) return;
    
    const alertClass = `alert alert-${type}`;
    statusDiv.innerHTML = `
        <div class="${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // 5 saniye sonra otomatik kapat (success ve info için)
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            const alert = statusDiv.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

// Seçim listelerini güncelle
function updateSelectionLists() {
    // Sınıf seçim listesini güncelle
    if (typeof updateClassSelection === 'function') {
        updateClassSelection();
    }
    
    // Derslik seçim listesini güncelle
    if (classroomManager && typeof classroomManager.updateClassroomSelection === 'function') {
        classroomManager.updateClassroomSelection();
    }
}

// Tüm seçimleri temizle
function clearAllSelections() {
    // Sınıf seçimlerini temizle
    document.querySelectorAll('#classSelection input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Derslik seçimlerini temizle
    document.querySelectorAll('#classroomSelection input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Tüm sınıfları seç/seçimi kaldır
function toggleAllClasses() {
    const checkboxes = document.querySelectorAll('#classSelection input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
}

// Tüm derslikleri seç/seçimi kaldır
function toggleAllClassrooms() {
    const checkboxes = document.querySelectorAll('#classroomSelection input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
}

// Hata yakalama
window.addEventListener('error', function(e) {
    console.error('Uygulama hatası:', e.error);
    
    // Kullanıcıya hata mesajı göster
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    errorDiv.innerHTML = `
        <strong>Hata!</strong> Bir sorun oluştu. Lütfen sayfayı yenileyin.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 10 saniye sonra otomatik kapat
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
});

// Konsol mesajları
console.log(`
╔══════════════════════════════════════╗
║        Kelebek Dağıtım Sistemi       ║
║              v1.0.0                  ║
║                                      ║
║  Okul sınav dağıtım yönetim sistemi  ║
╚══════════════════════════════════════╝
`);

// Debug modu için global fonksiyonlar
window.enableDebug = function() {
    debugMode = true;
    console.log('Debug modu etkinleştirildi');
};

window.disableDebug = function() {
    debugMode = false;
    console.log('Debug modu devre dışı bırakıldı');
};

// Global yardımcı fonksiyonlar
window.clearAllSelections = clearAllSelections;
window.toggleAllClasses = toggleAllClasses;
window.toggleAllClassrooms = toggleAllClassrooms;
