# ⚡ Interactive Virtual Lab & Circuit Builder v5.0

> **ห้องปฏิบัติการเสมือนจริงและระบบจำลองวงจรไฟฟ้ากระแสตรง (DC) / กระแสสลับ (AC)**  
> สร้างและวิเคราะห์วงจรไฟฟ้าแบบเรียลไทม์ผ่านเว็บเบราว์เซอร์ ใช้งานได้ทันทีโดยไม่ต้องติดตั้งโปรแกรม

---

## 🌟 ฟีเจอร์เด่น (Key Features)

- 🔌 **Interactive Circuit Builder**: ลากวางอุปกรณ์ (Resistor, Capacitor, Inductor, AC/DC Source, Ground, Switch, Lamp, Meter) และลากสายเชื่อมต่อวงจรได้อย่างอิสระ
- 📊 **MNA Circuit Solver**: คำนวณแรงดันและกระแสทุกโหนดแบบแม่นยำด้วยวิธี Modified Nodal Analysis (Complex Matrix Solver สำหรับ AC)
- 📈 **Real-Time Oscilloscope & Phasor**: แสดงรูปคลื่นสัญญาณ Sine Wave และ Phasor Diagram แบบ Dynamic
- ⚡ **Star-Delta (Y-Δ) Converter & Visualizer**: จำลองการแปลงวงจรโหลดแบบสตาร์และเดลต้า
- 📉 **Resonance Curve Analyzer**: วิเคราะห์ความถี่เรโซแนนซ์ของวงจร RLC (Series / Parallel)
- 🎨 **Voltage & Current Visualization**: แอนิเมชันกระแสไหลและโค้ดสีระดับแรงดันไฟฟ้าบนสายไฟ
- 🚀 **Zero-Build Architecture**: พัฒนาด้วย Native HTML5 / ES6 Modules พร้อมใช้งานบน GitHub Pages ทันที

---

## 🚀 วิธีเปิดใช้งานบน GitHub Pages (Online Deployment)

โปรเจกต์นี้เป็น Pure Frontend (Static Website) สามารถเปิดออนไลน์ฟรีผ่าน **GitHub Pages** ได้ใน 3 ขั้นตอน:

1. **อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น GitHub Repository** (เช่น ชื่อ `circuit-builder`)
2. ไปที่แท็บ **Settings** > **Pages** ในหน้า GitHub Repository ของคุณ
3. ในส่วน **Build and deployment**:
   - **Source**: เลือก `Deploy from a branch`
   - **Branch**: เลือก `main` (หรือ `master`) และโฟลเดอร์ `/ (root)`
   - กดปุ่ม **Save**
4. รอระบบประมวลผลประมาณ 1-2 นาที คุณจะได้ URL เว็บไซต์ เช่น:  
   `https://<your-username>.github.io/<repository-name>/`

---

## 💻 วิธีรันบนเครื่องตัวเอง (Local Development)

เนื่องจากโปรเจกต์ใช้ JavaScript ES Modules (`import/export`) จึงต้องเปิดผ่าน Web Server ท้องถิ่น (ไม่สามารถดับเบิลคลิกไฟล์ HTML ตรงๆ ได้):

### ตัวเลือกที่ 1: VS Code Live Server
1. เปิดโฟลเดอร์นี้ใน VS Code
2. คลิกขวาที่ `index.html` > เลือก **Open with Live Server**

### ตัวเลือกที่ 2: Python
```bash
python -m http.server 8080
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:8080`

### ตัวเลือกที่ 3: Node.js (npx)
```bash
npx serve .
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── index.html              # หน้าเว็บหลัก (Virtual Lab & Circuit Builder)
├── .nojekyll               # ป้องกัน GitHub Pages Jekyll ข้ามไฟล์ JS
├── css/
│   └── style.css           # สไตล์และเลย์เอาต์เฉพาะของ Canvas & UI
└── js/
    ├── app.js              # Entry point ของโมดูล
    ├── controllers/        # ตัวควบคุมหลัก (Builder & Presets)
    ├── editor/             # Property Inspector & Controls
    ├── instruments/        # เครื่องมือวัด (Oscilloscope, Probes)
    ├── models/             # Data Models, Complex Math, Topology
    ├── render/             # วาดแอนิเมชันกระแสและสีกราฟิก
    ├── solver/             # MNA Solver & Matrix Calculations
    ├── utils/              # SI Unit Formatter & Helper functions
    └── visualizers/        # แผนภาพวงจร AC, Phasor, Star-Delta, Resonance
```

---

## 📄 License
This project is open-source and free for educational use.
