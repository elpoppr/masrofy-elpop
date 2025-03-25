// بيانات التطبيق
let appData = {
    balance: parseFloat(localStorage.getItem("balance")) || 0,
    transactions: JSON.parse(localStorage.getItem("transactions")) || []
};

// عناصر DOM
const elements = {
    balance: document.getElementById("balance"),
    amount: document.getElementById("amount"),
    note: document.getElementById("note"),
    addIncome: document.getElementById("addIncome"),
    addExpense: document.getElementById("addExpense"),
    transactions: document.getElementById("transactions"),
    totalIncome: document.getElementById("totalIncome"),
    totalExpense: document.getElementById("totalExpense"),
    exportData: document.getElementById("exportData"),
    importData: document.getElementById("importData"),
    importFile: document.getElementById("importFile"),
    resetBtn: document.getElementById("resetBtn"),
    confirmBox: document.getElementById("confirmBox"),
    cancelBtn: document.getElementById("cancelBtn"),
    confirmReset: document.getElementById("confirmReset"),
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage"),
    micNoteCheckbox: document.getElementById("micNoteCheckbox")
};

// تهيئة التعرف على الكلام
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let activeMic = null;

// دالة لضبط حجم الخط بناءً على حجم الشاشة
function adjustFontSize() {
    const width = window.innerWidth;
    const html = document.documentElement;
    
    if (width < 400) {
        html.style.fontSize = '14px';
    } else if (width < 600) {
        html.style.fontSize = '15px';
    } else {
        html.style.fontSize = '16px';
    }
}

// تهيئة التطبيق
function initApp() {
    adjustFontSize();
    setupVoiceRecognition();
    setupEventListeners();
    updateUI();
    
    window.addEventListener('resize', adjustFontSize);
}

// إعداد التعرف الصوتي
function setupVoiceRecognition() {
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = "ar-SA";
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            if (activeMic) {
                activeMic.classList.add("mic-active");
            }
        };
        
        recognition.onend = function() {
            if (activeMic) {
                activeMic.classList.remove("mic-active");
                elements.micNoteCheckbox.checked = false;
            }
            activeMic = null;
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            elements.note.value = transcript;
        };
        
        recognition.onerror = function(event) {
            showToast("حدث خطأ في التعرف على الصوت", "error");
        };
    } else {
        showToast("المتصفح لا يدعم التعرف على الصوت", "error");
    }
}

// بدء التعرف الصوتي
function startVoiceRecognition(checkbox) {
    if (recognition) {
        activeMic = checkbox.nextElementSibling;
        try {
            recognition.start();
        } catch (e) {
            showToast("لا يمكن بدء التعرف على الصوت", "error");
            checkbox.checked = false;
        }
    } else {
        checkbox.checked = false;
    }
}

// إضافة معاملة جديدة
function addTransaction(type) {
    const amount = parseFloat(elements.amount.value);
    const note = elements.note.value.trim();
    
    if (isNaN(amount)) {
        showToast("الرجاء إدخال مبلغ صحيح", "error");
        return;
    }
    
    if (note === "") {
        showToast("الرجاء إدخال وصف", "error");
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type,
        amount,
        note,
        date: new Date().toISOString()
    };
    
    appData.transactions.push(transaction);
    
    if (type === "income") {
        appData.balance += amount;
    } else {
        appData.balance -= amount;
    }
    
    saveData();
    updateUI();
    resetForm();
    
    showToast(`تمت إضافة ${type === "income" ? "دخل" : "مصروف"} بنجاح`, "success");
}

// تحديث واجهة المستخدم
function updateUI() {
    elements.balance.textContent = `${appData.balance.toFixed(2)} EGP`;
    
    const totalIncome = appData.transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = appData.transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    
    elements.totalIncome.textContent = totalIncome.toFixed(2);
    elements.totalExpense.textContent = totalExpense.toFixed(2);
    
    updateTransactionsList();
}

// تحديث قائمة المعاملات
function updateTransactionsList() {
    // عرض جميع المعاملات دون تصفية
    let transactionsToShow = [...appData.transactions];
    
    transactionsToShow.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = "";
    
    if (transactionsToShow.length === 0) {
        html = `<div class="transaction-item">
            <p>لا توجد معاملات</p>
        </div>`;
    } else {
        transactionsToShow.forEach(transaction => {
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString("ar-EG");
            
            html += `
                <div class="transaction-item">
                    <div>
                        <p style="margin: 0; font-weight: bold;">${transaction.note}</p>
                        <small style="color: #777;">${formattedDate}</small>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-weight: bold;" class="${transaction.type}">
                            ${transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
                        </p>
                        <button onclick="deleteTransaction(${transaction.id})" class="btn" style="padding: 2px 5px; font-size: 12px;">
                            حذف
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    elements.transactions.innerHTML = html;
}

// حذف معاملة
function deleteTransaction(id) {
    const index = appData.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        const transaction = appData.transactions[index];
        
        if (transaction.type === "income") {
            appData.balance -= transaction.amount;
        } else {
            appData.balance += transaction.amount;
        }
        
        appData.transactions.splice(index, 1);
        saveData();
        updateUI();
        
        showToast("تم حذف المعاملة", "success");
    }
}

// تصدير البيانات
function exportData() {
    const dataStr = JSON.stringify(appData);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `expenses-data-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast("تم تصدير البيانات", "success");
}

// استيراد البيانات
function importData() {
    elements.importFile.click();
}

// معالجة ملف الاستيراد
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data && typeof data.balance === "number" && Array.isArray(data.transactions)) {
                appData = data;
                saveData();
                updateUI();
                showToast("تم استيراد البيانات بنجاح", "success");
            } else {
                showToast("ملف غير صالح", "error");
            }
        } catch (err) {
            showToast("خطأ في قراءة الملف", "error");
        }
    };
    reader.readAsText(file);
    e.target.value = "";
}

// إعادة تعيين البيانات
function resetData() {
    appData = {
        balance: 0,
        transactions: []
    };
    
    saveData();
    updateUI();
    elements.confirmBox.style.display = "none";
    showToast("تم إعادة تعيين البيانات", "success");
}

// عرض رسالة toast
function showToast(message, type) {
    elements.toastMessage.textContent = message;
    elements.toast.style.backgroundColor = type === "error" ? "#e74c3c" : "#2ecc71";
    elements.toast.style.display = "block";
    
    setTimeout(() => {
        elements.toast.style.display = "none";
    }, 3000);
}

// حفظ البيانات في localStorage
function saveData() {
    localStorage.setItem("balance", appData.balance.toString());
    localStorage.setItem("transactions", JSON.stringify(appData.transactions));
}

// إعادة تعيين نموذج المعاملة
function resetForm() {
    elements.amount.value = "";
    elements.note.value = "";
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    elements.addIncome.addEventListener("click", () => addTransaction("income"));
    elements.addExpense.addEventListener("click", () => addTransaction("expense"));
    elements.exportData.addEventListener("click", exportData);
    elements.importData.addEventListener("click", importData);
    elements.importFile.addEventListener("change", handleFileImport);
    elements.resetBtn.addEventListener("click", () => {
        elements.confirmBox.style.display = "flex";
    });
    elements.cancelBtn.addEventListener("click", () => {
        elements.confirmBox.style.display = "none";
    });
    elements.confirmReset.addEventListener("click", resetData);
    elements.micNoteCheckbox.addEventListener("change", function() {
        if (this.checked) {
            startVoiceRecognition(this);
        }
    });
}

// جعل الدوال متاحة عالمياً
window.deleteTransaction = deleteTransaction;

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", initApp);
