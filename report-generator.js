// Rapor Oluşturucu Sistemi

class ReportGenerator {
    constructor() {
        this.currentReports = null;
    }

    // Dağıtım sonuçlarından raporlar oluştur
    generateReports(distribution) {
        console.log('generateReports çağrıldı:', distribution);

        if (!distribution || !distribution.distribution) {
            console.error('Geçersiz dağıtım verisi');
            return;
        }

        try {
            this.currentReports = {
                examInfo: distribution.examInfo,
                classroomReports: this.createClassroomReports(distribution.distribution),
                summary: this.createSummaryReport(distribution),
                createdAt: new Date().toISOString()
            };

            console.log('Raporlar oluşturuldu:', this.currentReports);
            this.displayReports();
            return this.currentReports;
        } catch (error) {
            console.error('Rapor oluşturma hatası:', error);
        }
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
        console.log('displayReports çağrıldı');
        const container = document.getElementById('reports-container');
        console.log('Container bulundu:', container);
        console.log('Current reports:', this.currentReports);

        if (!container) {
            console.error('reports-container bulunamadı');
            return;
        }

        if (!this.currentReports) {
            console.error('currentReports boş');
            return;
        }

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
                                    <i class="bi bi-printer"></i> Liste + Yerleşim Planı Yazdır
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="reportGenerator.printClassroomListOnly('${report.classroom.id}')">
                                    <i class="bi bi-list-ul"></i> Sadece Liste Yazdır
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

    // Yerleşim planı oluştur
    createSeatingPlan(students) {
        // Öğrencileri sınıflarına göre grupla
        const studentsByClass = {};
        students.forEach(student => {
            const classLevel = this.extractClassLevel(student.originalClass);
            if (!studentsByClass[classLevel]) {
                studentsByClass[classLevel] = [];
            }
            studentsByClass[classLevel].push(student);
        });

        // Sıra düzeni oluştur (her sıraya max 2 öğrenci)
        const seatingPlan = [];
        const classLevels = Object.keys(studentsByClass);
        let currentRow = 0;
        let currentSeat = 0;

        // Tüm öğrenciler yerleştirilene kadar devam et
        while (students.length > 0) {
            let studentPlaced = false;

            // Her sınıf seviyesinden sırayla öğrenci al
            for (let i = 0; i < classLevels.length; i++) {
                const classLevel = classLevels[i];
                if (studentsByClass[classLevel].length > 0) {
                    const student = studentsByClass[classLevel].shift();

                    // Yeni sıra başlat
                    if (currentSeat === 0) {
                        seatingPlan[currentRow] = [];
                    }

                    seatingPlan[currentRow][currentSeat] = student;
                    currentSeat++;
                    studentPlaced = true;

                    // Sıra doldu, yeni sıraya geç
                    if (currentSeat >= 2) {
                        currentRow++;
                        currentSeat = 0;
                    }

                    // students array'inden de çıkar
                    const studentIndex = students.findIndex(s =>
                        s.student_no === student.student_no &&
                        s.originalClass === student.originalClass
                    );
                    if (studentIndex !== -1) {
                        students.splice(studentIndex, 1);
                    }
                }
            }

            // Hiç öğrenci yerleştirilemediyse döngüden çık
            if (!studentPlaced) break;
        }

        return seatingPlan;
    }

    // Sınıf seviyesini çıkar (örn: "9. Sınıf / A Şubesi" -> "9")
    extractClassLevel(className) {
        const match = className.match(/(\d+)\./);
        return match ? match[1] : className;
    }

    // Belirli bir derslik raporunu yazdır
    printClassroomReport(classroomId) {
        const report = this.currentReports.classroomReports.find(r => r.classroom.id === classroomId);
        if (!report) return;

        // Yerleşim planı oluştur
        const seatingPlan = this.createSeatingPlan([...report.students]);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${report.classroom.name} - Öğrenci Listesi ve Yerleşim Planı</title>
                <style>
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 11px;
                        line-height: 1.3;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 15px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 8px;
                    }
                    .header h2 {
                        margin: 0 0 3px 0;
                        font-size: 16px;
                    }
                    .header h3 {
                        margin: 0;
                        font-size: 14px;
                        color: #666;
                    }
                    .info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        font-size: 10px;
                    }
                    .info-left, .info-right {
                        flex: 1;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 8px;
                    }
                    th, td {
                        border: 1px solid #333;
                        padding: 4px 3px;
                        text-align: left;
                        vertical-align: middle;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        text-align: center;
                        font-size: 10px;
                    }
                    td {
                        font-size: 9px;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .signature-col {
                        width: 60px;
                    }
                    .no-col {
                        width: 35px;
                    }
                    .sira-col {
                        width: 30px;
                    }
                    .class-col {
                        width: 40px;
                    }
                    .footer {
                        margin-top: 15px;
                        text-align: center;
                        font-size: 9px;
                        color: #666;
                    }

                    /* Yerleşim Planı Stilleri */
                    .seating-plan {
                        margin-top: 20px;
                    }
                    .seating-plan h3 {
                        text-align: center;
                        margin-bottom: 15px;
                        font-size: 14px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 5px;
                    }
                    .classroom-layout {
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 10px;
                    }
                    .teacher-desk {
                        text-align: center;
                        background-color: #333;
                        color: white;
                        padding: 10px;
                        margin-bottom: 30px;
                        font-weight: bold;
                        font-size: 12px;
                        border: 2px solid #333;
                    }
                    .desk-rows {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                        align-items: center;
                    }
                    .desk-row {
                        display: flex;
                        gap: 40px;
                        justify-content: center;
                        align-items: center;
                    }
                    .desk {
                        width: 160px;
                        height: 80px;
                        border: 3px solid #333;
                        display: flex;
                        background-color: #f9f9f9;
                        position: relative;
                    }
                    .desk.empty {
                        background-color: #e9e9e9;
                        border-style: dashed;
                    }
                    .desk-divider {
                        width: 3px;
                        background-color: #333;
                        position: absolute;
                        left: 50%;
                        top: 0;
                        bottom: 0;
                        transform: translateX(-50%);
                    }
                    .desk-seat {
                        width: 50%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        padding: 4px;
                        text-align: center;
                        font-size: 8px;
                        line-height: 1.1;
                    }
                    .desk-seat.left {
                        border-right: none;
                    }
                    .desk-seat.right {
                        border-left: none;
                    }
                    .desk-seat.empty {
                        color: #999;
                        font-style: italic;
                    }
                    .student-info {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 1px;
                    }
                    .student-no {
                        font-weight: bold;
                        font-size: 9px;
                        color: #333;
                    }
                    .student-name {
                        font-size: 7px;
                        color: #000;
                        font-weight: 500;
                    }
                    .student-class {
                        font-size: 6px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${this.currentReports.summary.examInfo.examName}</h2>
                    <h3>${report.classroom.name} Dersliği - Öğrenci Listesi</h3>
                </div>

                <div class="info">
                    <div class="info-left">
                        <strong>Tarih:</strong> ${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')}<br>
                        <strong>Saat:</strong> ${this.currentReports.summary.examInfo.examTime}
                    </div>
                    <div class="info-right" style="text-align: right;">
                        <strong>Derslik:</strong> ${report.classroom.name} (${report.classroom.floor})<br>
                        <strong>Öğrenci Sayısı:</strong> ${report.totalStudents}/${report.classroom.capacity}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="sira-col">Sıra</th>
                            <th class="no-col">No</th>
                            <th>Adı</th>
                            <th>Soyadı</th>
                            <th class="class-col">Sınıfı</th>
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

                <div class="page-break"></div>

                <div class="seating-plan">
                    <div class="header">
                        <h2>${this.currentReports.summary.examInfo.examName}</h2>
                        <h3>${report.classroom.name} Dersliği - Yerleşim Planı</h3>
                    </div>

                    <div class="classroom-layout">
                        <div class="teacher-desk">ÖĞRETMEN MASASI</div>
                        <div class="desk-rows">
        `);

        // Yerleşim planını 3'lü sıralar halinde yazdır (resimdeki gibi)
        for (let rowIndex = 0; rowIndex < seatingPlan.length; rowIndex += 3) {
            printWindow.document.write(`<div class="desk-row">`);

            // Her satırda 3 masa
            for (let deskIndex = 0; deskIndex < 3; deskIndex++) {
                const currentRowIndex = rowIndex + deskIndex;
                const row = seatingPlan[currentRowIndex];

                if (row || currentRowIndex < Math.ceil(report.totalStudents / 2)) {
                    printWindow.document.write(`<div class="desk ${!row ? 'empty' : ''}">`);
                    printWindow.document.write(`<div class="desk-divider"></div>`);

                    // Sol koltuk
                    const leftStudent = row ? row[0] : null;
                    printWindow.document.write(`<div class="desk-seat left">`);
                    if (leftStudent) {
                        printWindow.document.write(`
                            <div class="student-info">
                                <div class="student-no">${leftStudent.student_no}</div>
                                <div class="student-name">${leftStudent.first_name}</div>
                                <div class="student-name">${leftStudent.last_name}</div>
                                <div class="student-class">${leftStudent.originalClass}</div>
                            </div>
                        `);
                    } else {
                        printWindow.document.write(`<div class="empty">BOŞ</div>`);
                    }
                    printWindow.document.write(`</div>`);

                    // Sağ koltuk
                    const rightStudent = row ? row[1] : null;
                    printWindow.document.write(`<div class="desk-seat right">`);
                    if (rightStudent) {
                        printWindow.document.write(`
                            <div class="student-info">
                                <div class="student-no">${rightStudent.student_no}</div>
                                <div class="student-name">${rightStudent.first_name}</div>
                                <div class="student-name">${rightStudent.last_name}</div>
                                <div class="student-class">${rightStudent.originalClass}</div>
                            </div>
                        `);
                    } else {
                        printWindow.document.write(`<div class="empty">BOŞ</div>`);
                    }
                    printWindow.document.write(`</div>`);

                    printWindow.document.write(`</div>`);
                }
            }

            printWindow.document.write(`</div>`);
        }

        printWindow.document.write(`
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>Toplam ${report.totalStudents} öğrenci - ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturuldu</p>
                    <p>Not: Aynı sınıf düzeyinden öğrenciler yan yana ve arka arkaya yerleştirilmemiştir.</p>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    }

    // Sadece öğrenci listesini yazdır (yerleşim planı olmadan)
    printClassroomListOnly(classroomId) {
        const report = this.currentReports.classroomReports.find(r => r.classroom.id === classroomId);
        if (!report) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${report.classroom.name} - Öğrenci Listesi</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    .header h2 {
                        margin: 0 0 5px 0;
                        font-size: 18px;
                    }
                    .header h3 {
                        margin: 0;
                        font-size: 16px;
                        color: #666;
                    }
                    .info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 15px;
                        font-size: 11px;
                    }
                    .info-left, .info-right {
                        flex: 1;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        border: 1px solid #333;
                        padding: 6px 4px;
                        text-align: left;
                        vertical-align: middle;
                    }
                    th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        text-align: center;
                        font-size: 11px;
                    }
                    td {
                        font-size: 10px;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .signature-col {
                        width: 80px;
                    }
                    .no-col {
                        width: 40px;
                    }
                    .sira-col {
                        width: 35px;
                    }
                    .class-col {
                        width: 50px;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 10px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${this.currentReports.summary.examInfo.examName}</h2>
                    <h3>${report.classroom.name} Dersliği - Öğrenci Listesi</h3>
                </div>

                <div class="info">
                    <div class="info-left">
                        <strong>Tarih:</strong> ${new Date(this.currentReports.summary.examInfo.examDate).toLocaleDateString('tr-TR')}<br>
                        <strong>Saat:</strong> ${this.currentReports.summary.examInfo.examTime}
                    </div>
                    <div class="info-right" style="text-align: right;">
                        <strong>Derslik:</strong> ${report.classroom.name} (${report.classroom.floor})<br>
                        <strong>Öğrenci Sayısı:</strong> ${report.totalStudents}/${report.classroom.capacity}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="sira-col">Sıra</th>
                            <th class="no-col">No</th>
                            <th>Adı</th>
                            <th>Soyadı</th>
                            <th class="class-col">Sınıfı</th>
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
                <div class="footer">
                    <p>Toplam ${report.totalStudents} öğrenci - ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturuldu</p>
                </div>
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
