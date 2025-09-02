// Rapor Oluşturucu Sistemi

class ReportGenerator {
    constructor() {
        this.currentReports = null;
    }

    // Dağıtım sonuçlarından raporlar oluştur
    generateReports(distribution) {
        if (!distribution || !distribution.distribution) {
            console.error('Geçersiz dağıtım verisi');
            return;
        }

        this.currentReports = {
            examInfo: distribution.examInfo,
            classroomReports: this.createClassroomReports(distribution.distribution),
            summary: this.createSummaryReport(distribution),
            createdAt: new Date().toISOString()
        };

        this.displayReports();
        return this.currentReports;
    }

    // Her derslik için rapor oluştur
    createClassroomReports(distribution) {
        const reports = [];

        Object.values(distribution).forEach(classroomDist => {
            if (classroomDist.students.length === 0) return;

            // Sınıf dağılımını hesapla
            const classCounts = {};
            classroomDist.students.forEach(student => {
                classCounts[student.originalClass] = (classCounts[student.originalClass] || 0) + 1;
            });

            // Öğrencileri numaraya göre sırala
            const sortedStudents = [...classroomDist.students].sort((a, b) => {
                // Önce sınıfa göre, sonra numaraya göre sırala
                if (a.originalClass !== b.originalClass) {
                    return a.originalClass.localeCompare(b.originalClass);
                }
                return parseInt(a.student_no) - parseInt(b.student_no);
            });

            reports.push({
                classroom: classroomDist.classroom,
                students: sortedStudents,
                classCounts: classCounts,
                totalStudents: classroomDist.students.length,
                occupancyRate: Math.round((classroomDist.students.length / classroomDist.classroom.capacity) * 100)
            });
        });

        // Derslikleri ada göre sırala
        return reports.sort((a, b) => a.classroom.name.localeCompare(b.classroom.name));
    }

    // Özet rapor oluştur
    createSummaryReport(distribution) {
        const totalStudents = distribution.totalStudents;
        const totalClassrooms = distribution.totalClassrooms;
        const examInfo = distribution.examInfo;

        // Sınıf bazında istatistikler
        const classStats = {};
        Object.values(distribution.distribution).forEach(classroomDist => {
            classroomDist.students.forEach(student => {
                if (!classStats[student.originalClass]) {
                    classStats[student.originalClass] = {
                        totalStudents: 0,
                        classrooms: new Set()
                    };
                }
                classStats[student.originalClass].totalStudents++;
                classStats[student.originalClass].classrooms.add(classroomDist.classroom.name);
            });
        });

        // Set'leri array'e çevir
        Object.keys(classStats).forEach(className => {
            classStats[className].classrooms = Array.from(classStats[className].classrooms);
            classStats[className].classroomCount = classStats[className].classrooms.length;
        });

        return {
            totalStudents,
            totalClassrooms,
            examInfo,
            classStats,
            averageStudentsPerClassroom: Math.round(totalStudents / totalClassrooms),
            distributionDate: new Date().toLocaleDateString('tr-TR'),
            distributionTime: new Date().toLocaleTimeString('tr-TR')
        };
    }

    // Raporları görüntüle
    displayReports() {
        const container = document.getElementById('reports-container');
        if (!container || !this.currentReports) return;

        let html = `
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h5 class="mb-0"><i class="bi bi-graph-up"></i> Dağıtım Özeti</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Sınav Bilgileri</h6>
                                    <ul class="list-unstyled">
                                        <li><strong>Sınav:</strong> ${this.currentReports.summary.examInfo.examName}</li>
                                        <li><strong>Tarih:</strong> ${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')}</li>
                                        <li><strong>Saat:</strong> ${this.currentReports.summary.examInfo.examTime}</li>
                                        <li><strong>Dağıtım Tarihi:</strong> ${this.currentReports.summary.distributionDate} ${this.currentReports.summary.distributionTime}</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6>İstatistikler</h6>
                                    <ul class="list-unstyled">
                                        <li><strong>Toplam Öğrenci:</strong> ${this.currentReports.summary.totalStudents}</li>
                                        <li><strong>Kullanılan Derslik:</strong> ${this.currentReports.summary.totalClassrooms}</li>
                                        <li><strong>Ortalama Doluluk:</strong> ${this.currentReports.summary.averageStudentsPerClassroom} öğrenci/derslik</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <h6 class="mt-3">Sınıf Dağılımı</h6>
                            <div class="row">
        `;

        Object.entries(this.currentReports.summary.classStats).forEach(([className, stats]) => {
            html += `
                <div class="col-md-4 mb-2">
                    <div class="border rounded p-2">
                        <strong>${className}</strong><br>
                        <small class="text-muted">${stats.totalStudents} öğrenci, ${stats.classroomCount} derslik</small>
                    </div>
                </div>
            `;
        });

        html += `
                            </div>
                            <div class="mt-3 no-print">
                                <button class="btn btn-primary" onclick="reportGenerator.printAllReports()">
                                    <i class="bi bi-printer"></i> Tüm Raporları Yazdır
                                </button>
                                <button class="btn btn-success" onclick="reportGenerator.exportToExcel()">
                                    <i class="bi bi-file-excel"></i> Excel'e Aktar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Her derslik için rapor kartı
        this.currentReports.classroomReports.forEach(report => {
            html += `
                <div class="card report-card mb-4">
                    <div class="report-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-1">${report.classroom.name}</h5>
                                <small>${report.classroom.floor} - Kapasite: ${report.classroom.capacity}</small>
                            </div>
                            <div class="text-end">
                                <div class="badge bg-light text-dark fs-6">${report.totalStudents}/${report.classroom.capacity}</div>
                                <div class="small">%${report.occupancyRate} Doluluk</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-12">
                                <h6>Sınıf Dağılımı:</h6>
                                <div class="d-flex flex-wrap gap-2">
            `;

            Object.entries(report.classCounts).forEach(([className, count]) => {
                html += `<span class="badge bg-secondary">${className}: ${count}</span>`;
            });

            html += `
                                </div>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-bordered student-list-table">
                                <thead>
                                    <tr>
                                        <th style="width: 60px;">Sıra</th>
                                        <th style="width: 80px;">No</th>
                                        <th>Adı</th>
                                        <th>Soyadı</th>
                                        <th style="width: 100px;">Sınıfı</th>
                                        <th style="width: 100px;">İmza</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            report.students.forEach((student, index) => {
                html += `
                    <tr>
                        <td class="text-center"><strong>${index + 1}</strong></td>
                        <td class="text-center"><strong>${student.student_no}</strong></td>
                        <td>${student.first_name}</td>
                        <td>${student.last_name}</td>
                        <td class="text-center">${student.originalClass}</td>
                        <td></td>
                    </tr>
                `;
            });

            html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="row mt-3 no-print">
                            <div class="col-md-12">
                                <button class="btn btn-outline-primary btn-sm" onclick="reportGenerator.printClassroomReport('${report.classroom.id}')">
                                    <i class="bi bi-printer"></i> Bu Dersliği Yazdır
                                </button>
                                <button class="btn btn-outline-success btn-sm" onclick="reportGenerator.copyClassroomList('${report.classroom.id}')">
                                    <i class="bi bi-clipboard"></i> Listeyi Kopyala
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Belirli bir derslik raporunu yazdır
    printClassroomReport(classroomId) {
        const report = this.currentReports.classroomReports.find(r => r.classroom.id === classroomId);
        if (!report) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${report.classroom.name} - Öğrenci Listesi</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .text-center { text-align: center; }
                    .signature-col { width: 100px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${this.currentReports.summary.examInfo.examName}</h2>
                    <h3>${report.classroom.name} - Öğrenci Listesi</h3>
                </div>
                
                <div class="info">
                    <p><strong>Tarih:</strong> ${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Saat:</strong> ${this.currentReports.summary.examInfo.examTime}</p>
                    <p><strong>Derslik:</strong> ${report.classroom.name} (${report.classroom.floor})</p>
                    <p><strong>Kapasite:</strong> ${report.totalStudents}/${report.classroom.capacity} (%${report.occupancyRate} Doluluk)</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">Sıra</th>
                            <th style="width: 70px;">No</th>
                            <th>Adı</th>
                            <th>Soyadı</th>
                            <th style="width: 80px;">Sınıfı</th>
                            <th class="signature-col">İmza</th>
                        </tr>
                    </thead>
                    <tbody>
        `);

        report.students.forEach((student, index) => {
            printWindow.document.write(`
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${student.student_no}</td>
                    <td>${student.first_name}</td>
                    <td>${student.last_name}</td>
                    <td class="text-center">${student.originalClass}</td>
                    <td class="signature-col"></td>
                </tr>
            `);
        });

        printWindow.document.write(`
                    </tbody>
                </table>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    }

    // Tüm raporları yazdır
    printAllReports() {
        window.print();
    }

    // Derslik listesini kopyala
    copyClassroomList(classroomId) {
        const report = this.currentReports.classroomReports.find(r => r.classroom.id === classroomId);
        if (!report) return;

        let text = `${report.classroom.name} - Öğrenci Listesi\n`;
        text += `${this.currentReports.summary.examInfo.examName}\n`;
        text += `${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')} - ${this.currentReports.summary.examInfo.examTime}\n\n`;

        report.students.forEach((student, index) => {
            text += `${index + 1}. ${student.student_no} ${student.first_name} ${student.last_name} (${student.originalClass})\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('Öğrenci listesi panoya kopyalandı!');
        }).catch(err => {
            console.error('Kopyalama hatası:', err);
            alert('Kopyalama işlemi başarısız oldu.');
        });
    }

    // Excel'e aktar (basit CSV formatında)
    exportToExcel() {
        if (!this.currentReports) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Başlık bilgileri
        csvContent += `Sınav,${this.currentReports.summary.examInfo.examName}\n`;
        csvContent += `Tarih,${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')}\n`;
        csvContent += `Saat,${this.currentReports.summary.examInfo.examTime}\n\n`;

        // Her derslik için veri
        this.currentReports.classroomReports.forEach(report => {
            csvContent += `\nDerslik,${report.classroom.name}\n`;
            csvContent += `Kat,${report.classroom.floor}\n`;
            csvContent += `Kapasite,${report.classroom.capacity}\n`;
            csvContent += `Öğrenci Sayısı,${report.totalStudents}\n\n`;
            csvContent += "Sıra,No,Adı,Soyadı,Sınıfı\n";

            report.students.forEach((student, index) => {
                csvContent += `${index + 1},${student.student_no},${student.first_name},${student.last_name},${student.originalClass}\n`;
            });

            csvContent += "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${this.currentReports.summary.examInfo.examName}_Dagitim_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Mevcut raporları getir
    getCurrentReports() {
        return this.currentReports;
    }
}

// Global instance
const reportGenerator = new ReportGenerator();

// Global fonksiyonları window objesine ekle
window.reportGenerator = reportGenerator;
