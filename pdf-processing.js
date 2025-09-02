// PDF'den sınıf ve öğrenci bilgilerini çıkarma
async function extractClassInfo(pdf) {
    const classes = {};
    const numPages = pdf.numPages;
    
    try {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            debugLog(`Sayfa ${pageNum}/${numPages} işleniyor...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            debugLog(`Sayfa ${pageNum} - metin öğe sayısı: ${textContent.items.length}`);
            
            // 1. Tüm metin içeriğini birleştirme
            let fullText = '';
            let prevItem = null;
            let lineTexts = [];
            let currentLine = [];
            
            // İlk adımda satırları oluştur
            for (const item of textContent.items) {
                if (prevItem && Math.abs(prevItem.transform[5] - item.transform[5]) < 2) {
                    // Aynı satırda, önceki öğeye ekle
                    currentLine.push(item);
                } else {
                    // Yeni satır başlat
                    if (currentLine.length > 0) {
                        lineTexts.push(currentLine);
                    }
                    currentLine = [item];
                }
                prevItem = item;
            }
            
            // Son satırı ekle
            if (currentLine.length > 0) {
                lineTexts.push(currentLine);
            }
            
            // Her satırı işle ve metne dönüştür
            let lines = [];
            for (const line of lineTexts) {
                // Satırdaki öğeleri x pozisyonuna göre sırala
                line.sort((a, b) => a.transform[4] - b.transform[4]);
                
                let lineText = '';
                let prevLineItem = null;
                
                for (const item of line) {
                    if (prevLineItem) {
                        // Öğeler arasındaki mesafeyi kontrol et
                        const gap = item.transform[4] - (prevLineItem.transform[4] + prevLineItem.width);
                        
                        // Yakın karakterleri birleştir (küçük aralıkları yok say)
                        if (gap < 2) {
                            lineText += item.str;
                        } else if (gap < 20) {
                            // Normal kelime aralığı
                            lineText += ' ' + item.str;
                        } else {
                            // Büyük boşluk, muhtemelen sütun aralığı
                            lineText += '\t' + item.str;
                        }
                    } else {
                        lineText += item.str;
                    }
                    prevLineItem = item;
                }
                
                lines.push(lineText);
                fullText += lineText + '\n';
            }
            
            // Geliştirme modunda metin içeriğini gösterme
            if (debugMode) {
                debugLog(`Sayfa ${pageNum} metin içeriği (ilk 500 karakter):`, fullText.substring(0, 500) + '...');
            }
            
            // 2. Sınıf adını bulma
            const classNamePattern = /(\d+\.\s*Sınıf\s*\/\s*[A-Z]\s*Şubesi.*?)(?:\n|$)/i;
            const classMatch = fullText.match(classNamePattern);
            let currentClass = null;
            
            if (classMatch) {
                let rawClassName = classMatch[1].trim();
                // Sınıf adını sadeleştir: "9. Sınıf / L Şubesi (ELEKTRİK-ELEKTRONİK TEKNOLOJİSİ ALANI)" -> "9/L"
                const simplifiedMatch = rawClassName.match(/(\d+)\.\s*Sınıf\s*\/\s*([A-Z])\s*Şubesi/i);
                if (simplifiedMatch) {
                    currentClass = `${simplifiedMatch[1]}/${simplifiedMatch[2]}`;
                } else {
                    currentClass = rawClassName;
                }
                debugLog(`Sınıf bulundu: ${rawClassName} -> ${currentClass}`);
                classes[currentClass] = [];
            } else {
                debugLog(`Sayfa ${pageNum}'de sınıf bilgisi bulunamadı`);
            }
            
            // 3. Öğrenci bilgilerini bulma ve sınıflandırma
            // Öğrenci bilgilerini hem tam metin hem de satır bazında ara
            if (currentClass) {
                // A) Satır bazlı arama (öncelikli)
                let studentsFound = false;
                
                for (const line of lines) {
                    // Tab karakterleri ile ayrılmış alanları içeren satırlar muhtemelen öğrenci satırlarıdır
                    if (line.includes('\t')) {
                        const columns = line.split('\t').map(col => col.trim());
                        
                        // En az 3 sütun var mı kontrol et (numara, isim, soyisim için)
                        if (columns.length >= 3) {
                            // İlk sütun numara mı kontrol et
                            const numberMatch = columns[0].match(/^\s*(\d+)\s*$/);
                            if (numberMatch) {
                                const studentNo = numberMatch[1];
                                
                                // Cinsiyet bilgisini bul (genellikle ayrı bir sütunda)
                                let genderIndex = -1;
                                for (let i = 1; i < columns.length; i++) {
                                    if (/^(Erkek|Kız|erkek|kız)$/i.test(columns[i])) {
                                        genderIndex = i;
                                        break;
                                    }
                                }
                                
                                if (genderIndex > 0) {
                                    // Ad ve soyad için uygun indeksleri belirle
                                    let firstName = columns[1].replace(/\s+/g, ' ').trim();
                                    let lastName = columns[genderIndex + 1] ? columns[genderIndex + 1].replace(/\s+/g, ' ').trim() : '';
                                    
                                    // Soyadı yoksa, ad ve soyadı aynı sütunda olabilir
                                    if (!lastName && firstName.includes(' ')) {
                                        const nameParts = firstName.split(' ');
                                        lastName = nameParts.pop();
                                        firstName = nameParts.join(' ');
                                    }
                                    
                                    if (firstName && lastName) {
                                        // Harfleri düzeltme
                                        firstName = mergeLetters(firstName);
                                        lastName = mergeLetters(lastName);
                                        
                                        classes[currentClass].push({
                                            student_no: studentNo,
                                            first_name: firstName, 
                                            last_name: lastName
                                        });
                                        
                                        studentsFound = true;
                                        
                                        if (debugMode && classes[currentClass].length <= 3) {
                                            debugLog(`Öğrenci bulundu (satır): ${studentNo} ${firstName} ${lastName}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Eğer satır bazlı arama öğrenci bulamadıysa, regex ile dene
                if (!studentsFound) {
                    debugLog(`Satır bazlı arama öğrenci bulamadı, regex ile deneniyor...`);
                    
                    // B) Regex ile arama (yedek yöntem)
                    const studentPattern = /\b(\d+)\s+([A-ZĞÜŞİÖÇÂÎÛa-zğüşıöçâîû\s]+?)\s+(Erkek|Kız|erkek|kız)\s+([A-ZĞÜŞİÖÇÂÎÛa-zğüşıöçâîû\s]+?)\s*(?:\n|$)/g;
                    
                    let match;
                    while ((match = studentPattern.exec(fullText)) !== null) {
                        let firstName = match[2].trim().replace(/\s+/g, ' ');
                        let lastName = match[4].trim().replace(/\s+/g, ' ');
                        
                        // Harfleri düzeltme
                        firstName = mergeLetters(firstName);
                        lastName = mergeLetters(lastName);
                        
                        classes[currentClass].push({
                            student_no: match[1].trim(),
                            first_name: firstName,
                            last_name: lastName
                        });
                        
                        if (debugMode && classes[currentClass].length <= 3) {
                            debugLog(`Öğrenci bulundu (regex): ${match[1].trim()} ${firstName} ${lastName}`);
                        }
                    }
                }
                
                // C) Son çare olarak, daha esnek bir desen dene
                if (classes[currentClass].length === 0) {
                    debugLog(`Standart desenlerle öğrenci bulunamadı, daha esnek desen deneniyor...`);
                    
                    for (const line of lines) {
                        // Başında sayı olan her satırı kontrol et
                        const loosePattern = /^\s*(\d+)\s+(.*)/;
                        const match = line.match(loosePattern);
                        
                        if (match) {
                            const studentNo = match[1].trim();
                            const restOfLine = match[2].trim();
                            
                            // Satırın geri kalanını boşluklara göre parçala
                            const parts = restOfLine.split(/\s+/);
                            
                            if (parts.length >= 2) {
                                // Son kelime soyad olarak kabul et
                                const lastName = parts.pop();
                                // Geri kalan kısım ad olarak kabul et
                                const firstName = parts.join(' ');
                                
                                if (firstName && lastName) {
                                    // Harfleri düzeltme
                                    let correctedFirstName = mergeLetters(firstName);
                                    let correctedLastName = mergeLetters(lastName);
                                    
                                    classes[currentClass].push({
                                        student_no: studentNo,
                                        first_name: correctedFirstName,
                                        last_name: correctedLastName
                                    });
                                    
                                    if (debugMode && classes[currentClass].length <= 3) {
                                        debugLog(`Öğrenci bulundu (esnek desen): ${studentNo} ${correctedFirstName} ${correctedLastName}`);
                                    }
                                }
                            }
                        }
                    }
                }
                
                debugLog(`${currentClass} sınıfında ${classes[currentClass].length} öğrenci bulundu`);
            }
        }
        
        return classes;
    } catch (err) {
        debugLog(`PDF işleme hatası: ${err.message}`);
        throw err;
    }
}

// Sınıfları ve öğrencileri görüntüleme - Kelebek sistemi için uyarlanmış
function displayClassesAndStudents(classes) {
    const studentsContainer = document.getElementById('students-container');
    if (!studentsContainer) {
        console.error('students-container elementi bulunamadı');
        return;
    }
    
    studentsContainer.innerHTML = '';
    
    // Global değişkende sakla
    window.studentClasses = classes;
    
    // Veri önişleme - Öğrenci numarası ve ad kontrolü
    Object.keys(classes).forEach(className => {
        classes[className].forEach(student => {
            // Eğer adın içinde numara varsa ayır
            if (student.first_name && student.first_name.match(/^\d+\s+/)) {
                const parts = student.first_name.trim().split(/\s+/);
                // İlk kelime numaraysa
                if (parts.length > 1 && /^\d+$/.test(parts[0])) {
                    student.student_no = parts[0];
                    // Geri kalan kısmı ad olarak al
                    student.first_name = parts.slice(1).join(' ');
                    debugLog(`Öğrenci verisi düzeltildi: ${student.student_no} - ${student.first_name}`);
                }
            }
        });
    });
    
    Object.entries(classes).forEach(([className, students]) => {
        if (students.length === 0) return;
        
        debugLog(`'${className}' sınıfı görüntüleniyor, ${students.length} öğrenci var`);
        
        // Her sınıf için bir kart oluştur
        const classCard = document.createElement('div');
        classCard.className = 'card student-class-card';
        
        // Kart başlığı - sınıf adı ve öğrenci sayısı
        const classHeader = document.createElement('div');
        classHeader.className = 'card-header d-flex justify-content-between align-items-center';
        classHeader.innerHTML = `
            <h6 class="mb-0"><i class="bi bi-people-fill"></i> ${className}</h6>
            <span class="badge bg-light text-dark">${students.length} Öğrenci</span>
        `;
        
        // Öğrenci tablosu
        const tableDiv = document.createElement('div');
        tableDiv.className = 'card-body p-0';
        tableDiv.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover student-table mb-0">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Adı</th>
                            <th>Soyadı</th>
                        </tr>
                    </thead>
                    <tbody id="student-list-${className.replace(/[^a-z0-9]/gi, '')}"></tbody>
                </table>
            </div>
        `;
        
        classCard.appendChild(classHeader);
        classCard.appendChild(tableDiv);
        studentsContainer.appendChild(classCard);
        
        // Öğrenci listesini doldur
        const studentList = document.getElementById(`student-list-${className.replace(/[^a-z0-9]/gi, '')}`);
        
        students.forEach((student, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><strong>${student.student_no}</strong></td>
                <td>${student.first_name}</td>
                <td>${student.last_name}</td>
            `;
            
            studentList.appendChild(row);
        });
    });
    
    // Sınıf seçim listesini güncelle
    updateClassSelection();
    
    debugLog('Tüm sınıflar ve öğrenciler başarıyla görüntülendi');
}

// Sınıf seçim listesini güncelle
function updateClassSelection() {
    const classSelection = document.getElementById('classSelection');
    if (!classSelection || !window.studentClasses) return;
    
    classSelection.innerHTML = '';
    
    Object.keys(window.studentClasses).forEach(className => {
        const studentCount = window.studentClasses[className].length;
        
        const checkDiv = document.createElement('div');
        checkDiv.className = 'form-check mb-2';
        checkDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${className}" id="class-${className.replace(/[^a-z0-9]/gi, '')}">
            <label class="form-check-label" for="class-${className.replace(/[^a-z0-9]/gi, '')}">
                ${className} <small class="text-muted">(${studentCount} öğrenci)</small>
            </label>
        `;
        
        classSelection.appendChild(checkDiv);
    });
}
