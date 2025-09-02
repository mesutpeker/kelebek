// Derslik Yönetimi Sistemi

class ClassroomManager {
    constructor() {
        this.classrooms = this.loadClassrooms();
        this.editingId = null;
    }

    // LocalStorage'dan derslikleri yükle
    loadClassrooms() {
        const stored = localStorage.getItem('classrooms');
        return stored ? JSON.parse(stored) : [];
    }

    // Derslikleri localStorage'a kaydet
    saveClassrooms() {
        localStorage.setItem('classrooms', JSON.stringify(this.classrooms));
    }

    // Yeni derslik ekle
    addClassroom(name, capacity, floor, notes = '') {
        const id = Date.now().toString();
        const classroom = {
            id,
            name: name.trim(),
            capacity: parseInt(capacity),
            floor: floor.trim(),
            notes: notes.trim(),
            createdAt: new Date().toISOString()
        };

        this.classrooms.push(classroom);
        this.saveClassrooms();
        this.displayClassrooms();
        this.updateClassroomSelection();
        
        return classroom;
    }

    // Derslik düzenle
    editClassroom(id, name, capacity, floor, notes = '') {
        const index = this.classrooms.findIndex(c => c.id === id);
        if (index !== -1) {
            this.classrooms[index] = {
                ...this.classrooms[index],
                name: name.trim(),
                capacity: parseInt(capacity),
                floor: floor.trim(),
                notes: notes.trim(),
                updatedAt: new Date().toISOString()
            };
            
            this.saveClassrooms();
            this.displayClassrooms();
            this.updateClassroomSelection();
            return true;
        }
        return false;
    }

    // Derslik sil
    deleteClassroom(id) {
        const index = this.classrooms.findIndex(c => c.id === id);
        if (index !== -1) {
            this.classrooms.splice(index, 1);
            this.saveClassrooms();
            this.displayClassrooms();
            this.updateClassroomSelection();
            return true;
        }
        return false;
    }

    // Derslik bul
    getClassroom(id) {
        return this.classrooms.find(c => c.id === id);
    }

    // Tüm derslikleri getir
    getAllClassrooms() {
        return [...this.classrooms];
    }

    // Derslikleri görüntüle
    displayClassrooms() {
        const container = document.getElementById('classrooms-container');
        const countBadge = document.getElementById('classroomCount');
        
        if (!container) return;

        countBadge.textContent = `${this.classrooms.length} Derslik`;

        if (this.classrooms.length === 0) {
            container.innerHTML = '<p class="text-muted">Henüz derslik eklenmemiş.</p>';
            return;
        }

        // Derslikleri ada göre sırala
        const sortedClassrooms = [...this.classrooms].sort((a, b) => a.name.localeCompare(b.name));

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th><i class="bi bi-door-open"></i> Derslik Adı</th>
                            <th><i class="bi bi-people"></i> Kapasite</th>
                            <th><i class="bi bi-building"></i> Kat</th>
                            <th><i class="bi bi-chat-text"></i> Notlar</th>
                            <th width="150">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sortedClassrooms.forEach(classroom => {
            html += `
                <tr>
                    <td><strong>${classroom.name}</strong></td>
                    <td>
                        <span class="badge bg-success">${classroom.capacity} kişi</span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${classroom.floor}</span>
                    </td>
                    <td>
                        <small class="text-muted">${classroom.notes || '-'}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary" onclick="classroomManager.startEdit('${classroom.id}')" title="Düzenle">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger" onclick="classroomManager.confirmDelete('${classroom.id}')" title="Sil">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // Düzenleme modunu başlat
    startEdit(id) {
        const classroom = this.getClassroom(id);
        if (!classroom) return;

        this.editingId = id;
        
        // Form alanlarını doldur
        document.getElementById('classroomName').value = classroom.name;
        document.getElementById('classroomCapacity').value = classroom.capacity;
        document.getElementById('classroomFloor').value = classroom.floor;
        document.getElementById('classroomNotes').value = classroom.notes;

        // Buton metinlerini değiştir
        const submitBtn = document.querySelector('#classroomForm button[type="submit"]');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Güncelle';
        submitBtn.className = 'btn btn-warning';
        cancelBtn.style.display = 'inline-block';

        // Forma scroll
        document.getElementById('classroomForm').scrollIntoView({ behavior: 'smooth' });
    }

    // Düzenlemeyi iptal et
    cancelEdit() {
        this.editingId = null;
        
        // Formu temizle
        document.getElementById('classroomForm').reset();
        
        // Buton metinlerini sıfırla
        const submitBtn = document.querySelector('#classroomForm button[type="submit"]');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        submitBtn.innerHTML = '<i class="bi bi-check"></i> Derslik Ekle';
        submitBtn.className = 'btn btn-success';
        cancelBtn.style.display = 'none';
    }

    // Silme onayı
    confirmDelete(id) {
        const classroom = this.getClassroom(id);
        if (!classroom) return;

        if (confirm(`"${classroom.name}" dersliğini silmek istediğinizden emin misiniz?`)) {
            if (this.deleteClassroom(id)) {
                this.showAlert('Derslik başarıyla silindi.', 'success');
            } else {
                this.showAlert('Derslik silinirken hata oluştu.', 'danger');
            }
        }
    }

    // Derslik seçim listesini güncelle
    updateClassroomSelection() {
        const classroomSelection = document.getElementById('classroomSelection');
        if (!classroomSelection) return;

        if (this.classrooms.length === 0) {
            classroomSelection.innerHTML = '<p class="text-muted small">Önce derslik ekleyin</p>';
            return;
        }

        classroomSelection.innerHTML = '';

        this.classrooms.forEach(classroom => {
            const checkDiv = document.createElement('div');
            checkDiv.className = 'form-check mb-2';
            checkDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${classroom.id}" id="classroom-${classroom.id}">
                <label class="form-check-label" for="classroom-${classroom.id}">
                    ${classroom.name} <small class="text-muted">(${classroom.capacity} kişi, ${classroom.floor})</small>
                </label>
            `;
            
            classroomSelection.appendChild(checkDiv);
        });
    }

    // Alert göster
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('#classrooms .card-body');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);

            // 3 saniye sonra otomatik kapat
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 3000);
        }
    }
}

// Global instance
const classroomManager = new ClassroomManager();

// Form submit event listener
document.addEventListener('DOMContentLoaded', function() {
    const classroomForm = document.getElementById('classroomForm');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (classroomForm) {
        classroomForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('classroomName').value.trim();
            const capacity = document.getElementById('classroomCapacity').value;
            const floor = document.getElementById('classroomFloor').value;
            const notes = document.getElementById('classroomNotes').value.trim();

            if (!name || !capacity) {
                classroomManager.showAlert('Derslik adı ve kapasite zorunludur.', 'danger');
                return;
            }

            if (classroomManager.editingId) {
                // Güncelleme
                if (classroomManager.editClassroom(classroomManager.editingId, name, capacity, floor, notes)) {
                    classroomManager.showAlert('Derslik başarıyla güncellendi.', 'success');
                    classroomManager.cancelEdit();
                } else {
                    classroomManager.showAlert('Derslik güncellenirken hata oluştu.', 'danger');
                }
            } else {
                // Yeni ekleme
                classroomManager.addClassroom(name, capacity, floor, notes);
                classroomManager.showAlert('Derslik başarıyla eklendi.', 'success');
                classroomForm.reset();
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            classroomManager.cancelEdit();
        });
    }

    // Sayfa yüklendiğinde derslikleri göster
    classroomManager.displayClassrooms();
    classroomManager.updateClassroomSelection();
});
