// Kelebek Dağıtım Algoritması

class DistributionEngine {
    constructor() {
        this.currentDistribution = null;
    }

    // Kelebek dağıtımı yap
    distributeStudents(examInfo, selectedClasses, selectedClassrooms) {
        try {
            // Seçilen sınıflardan öğrencileri topla
            const allStudents = this.collectStudents(selectedClasses);
            
            // Seçilen derslikleri al
            const classrooms = this.getSelectedClassrooms(selectedClassrooms);
            
            // Toplam kapasite kontrolü
            const totalCapacity = classrooms.reduce((sum, room) => sum + room.capacity, 0);
            
            if (allStudents.length > totalCapacity) {
                throw new Error(`Toplam öğrenci sayısı (${allStudents.length}) derslik kapasitesini (${totalCapacity}) aşıyor.`);
            }

            // Kelebek algoritması ile dağıt
            const distribution = this.butterflyAlgorithm(allStudents, classrooms);
            
            // Dağıtım bilgilerini kaydet
            this.currentDistribution = {
                examInfo,
                distribution,
                createdAt: new Date().toISOString(),
                totalStudents: allStudents.length,
                totalClassrooms: classrooms.length
            };

            return this.currentDistribution;
            
        } catch (error) {
            console.error('Dağıtım hatası:', error);
            throw error;
        }
    }

    // Seçilen sınıflardan öğrencileri topla
    collectStudents(selectedClasses) {
        const allStudents = [];
        
        selectedClasses.forEach(className => {
            if (window.studentClasses && window.studentClasses[className]) {
                window.studentClasses[className].forEach(student => {
                    allStudents.push({
                        ...student,
                        originalClass: className
                    });
                });
            }
        });

        return allStudents;
    }

    // Seçilen derslikleri al
    getSelectedClassrooms(selectedClassroomIds) {
        const classrooms = [];
        
        selectedClassroomIds.forEach(id => {
            const classroom = classroomManager.getClassroom(id);
            if (classroom) {
                classrooms.push(classroom);
            }
        });

        // Derslikleri kapasiteye göre sırala (büyükten küçüğe)
        return classrooms.sort((a, b) => b.capacity - a.capacity);
    }

    // Kelebek Algoritması - Aynı sınıftan öğrencileri farklı dersliklere dağıt
    butterflyAlgorithm(students, classrooms) {
        const distribution = {};
        
        // Her derslik için boş liste oluştur
        classrooms.forEach(classroom => {
            distribution[classroom.id] = {
                classroom: classroom,
                students: [],
                remainingCapacity: classroom.capacity
            };
        });

        // Öğrencileri sınıflarına göre grupla
        const studentsByClass = {};
        students.forEach(student => {
            if (!studentsByClass[student.originalClass]) {
                studentsByClass[student.originalClass] = [];
            }
            studentsByClass[student.originalClass].push(student);
        });

        // Her sınıfın öğrencilerini karıştır (rastgele sıralama)
        Object.keys(studentsByClass).forEach(className => {
            studentsByClass[className] = this.shuffleArray(studentsByClass[className]);
        });

        // Kelebek dağıtımı: Her sınıftan öğrencileri sırayla farklı dersliklere yerleştir
        const classNames = Object.keys(studentsByClass);
        let classroomIndex = 0;
        
        // Tüm öğrenciler yerleştirilene kadar devam et
        let allStudentsPlaced = false;
        while (!allStudentsPlaced) {
            allStudentsPlaced = true;
            
            // Her sınıftan bir öğrenci al ve sıradaki dersliğe yerleştir
            classNames.forEach(className => {
                if (studentsByClass[className].length > 0) {
                    allStudentsPlaced = false;
                    
                    // Uygun derslik bul
                    let placed = false;
                    let attempts = 0;
                    
                    while (!placed && attempts < classrooms.length) {
                        const currentClassroom = classrooms[classroomIndex % classrooms.length];
                        
                        if (distribution[currentClassroom.id].remainingCapacity > 0) {
                            // Öğrenciyi yerleştir
                            const student = studentsByClass[className].shift();
                            distribution[currentClassroom.id].students.push(student);
                            distribution[currentClassroom.id].remainingCapacity--;
                            placed = true;
                        }
                        
                        classroomIndex = (classroomIndex + 1) % classrooms.length;
                        attempts++;
                    }
                    
                    // Eğer hiçbir dersliğe yerleştirilemediyse hata
                    if (!placed && studentsByClass[className].length > 0) {
                        throw new Error('Tüm derslikler dolu, öğrenci yerleştirilemedi.');
                    }
                }
            });
        }

        return distribution;
    }

    // Array karıştırma fonksiyonu (Fisher-Yates shuffle)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Dağıtım sonuçlarını görüntüle
    displayDistributionResults(distribution) {
        const container = document.getElementById('distribution-results');
        if (!container) return;

        let html = `
            <div class="distribution-summary">
                <h5><i class="bi bi-info-circle"></i> Dağıtım Özeti</h5>
                <div class="row">
                    <div class="col-md-3">
                        <div class="text-center">
                            <h4 class="text-primary">${distribution.totalStudents}</h4>
                            <small>Toplam Öğrenci</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h4 class="text-success">${distribution.totalClassrooms}</h4>
                            <small>Kullanılan Derslik</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h4 class="text-info">${distribution.examInfo.examName}</h4>
                            <small>Sınav</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <h4 class="text-warning">${new Date(distribution.examInfo.examDate).toLocaleDateString('tr-TR')}</h4>
                            <small>Tarih</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Her derslik için detayları göster
        Object.values(distribution.distribution).forEach(classroomDist => {
            if (classroomDist.students.length === 0) return;

            // Sınıf dağılımını hesapla
            const classCounts = {};
            classroomDist.students.forEach(student => {
                classCounts[student.originalClass] = (classCounts[student.originalClass] || 0) + 1;
            });

            html += `
                <div class="distribution-classroom">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6><i class="bi bi-door-open"></i> ${classroomDist.classroom.name}</h6>
                        <div>
                            <span class="badge bg-success me-2">${classroomDist.students.length}/${classroomDist.classroom.capacity}</span>
                            <span class="badge bg-secondary">${classroomDist.classroom.floor}</span>
                        </div>
                    </div>
                    
                    <div class="butterfly-visualization mb-3">
                        <div class="text-center">
                            <small class="text-white-50">Sınıf Dağılımı:</small><br>
            `;

            Object.entries(classCounts).forEach(([className, count]) => {
                html += `<span class="butterfly-wing">${className}: ${count}</span>`;
            });

            html += `
                        </div>
                    </div>
                    
                    <div class="row">
            `;

            // Öğrencileri 3 sütunda göster
            const studentsPerColumn = Math.ceil(classroomDist.students.length / 3);
            for (let col = 0; col < 3; col++) {
                html += '<div class="col-md-4"><ul class="list-unstyled small">';
                
                const startIndex = col * studentsPerColumn;
                const endIndex = Math.min(startIndex + studentsPerColumn, classroomDist.students.length);
                
                for (let i = startIndex; i < endIndex; i++) {
                    const student = classroomDist.students[i];
                    html += `
                        <li class="mb-1">
                            <strong>${student.student_no}</strong> ${student.first_name} ${student.last_name}
                            <small class="text-muted">(${student.originalClass})</small>
                        </li>
                    `;
                }
                
                html += '</ul></div>';
            }

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Mevcut dağıtımı getir
    getCurrentDistribution() {
        return this.currentDistribution;
    }
}

// Global instance
const distributionEngine = new DistributionEngine();

// Form submit event listener
document.addEventListener('DOMContentLoaded', function() {
    const distributionForm = document.getElementById('distributionForm');

    if (distributionForm) {
        distributionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const examName = document.getElementById('examName').value.trim();
            const examDate = document.getElementById('examDate').value;
            const examTime = document.getElementById('examTime').value;

            if (!examName || !examDate || !examTime) {
                alert('Lütfen tüm sınav bilgilerini doldurun.');
                return;
            }

            // Seçilen sınıfları al
            const selectedClasses = [];
            document.querySelectorAll('#classSelection input[type="checkbox"]:checked').forEach(checkbox => {
                selectedClasses.push(checkbox.value);
            });

            if (selectedClasses.length === 0) {
                alert('Lütfen en az bir sınıf seçin.');
                return;
            }

            // Seçilen derslikleri al
            const selectedClassrooms = [];
            document.querySelectorAll('#classroomSelection input[type="checkbox"]:checked').forEach(checkbox => {
                selectedClassrooms.push(checkbox.value);
            });

            if (selectedClassrooms.length === 0) {
                alert('Lütfen en az bir derslik seçin.');
                return;
            }

            try {
                const examInfo = { examName, examDate, examTime };
                const distribution = distributionEngine.distributeStudents(examInfo, selectedClasses, selectedClassrooms);
                
                distributionEngine.displayDistributionResults(distribution);
                
                // Raporlar sekmesini güncelle
                if (window.reportGenerator) {
                    window.reportGenerator.generateReports(distribution);
                }
                
                alert('Kelebek dağıtımı başarıyla tamamlandı!');
                
            } catch (error) {
                alert('Dağıtım hatası: ' + error.message);
                console.error('Distribution error:', error);
            }
        });
    }
});
