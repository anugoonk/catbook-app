import { Link } from 'react-router-dom';
import PawIcon from '../components/PawIcon';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-[18px] font-bold text-[#050505] mb-3 flex items-center gap-2">
      <span className="w-1 h-5 bg-[#4267B2] rounded-full shrink-0" />
      {title}
    </h2>
    <div className="text-[#4b4f56] text-[15px] leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacyPage = () => (
  <div className="min-h-screen bg-[#f0f2f5]">
    {/* Header */}
    <div className="bg-[#4267B2] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <div className="bg-white/20 p-2.5 rounded-full">
            <PawIcon className="w-6 h-6 text-white" />
          </div>
        </Link>
        <div>
          <h1 className="text-[26px] font-black">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-blue-200 text-sm mt-0.5">มีผลบังคับใช้ตั้งแต่ 1 มิถุนายน 2568</p>
        </div>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8">

        <p className="text-[#65676B] text-[15px] leading-relaxed mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          CatBook ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน นโยบายนี้อธิบายวิธีที่เราเก็บ ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณ
          ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
        </p>

        <Section title="ข้อมูลที่เราเก็บรวบรวม">
          <p><strong>ข้อมูลที่คุณให้โดยตรง:</strong> ชื่ออีเมล รหัสผ่าน (เข้ารหัสด้วย scrypt) ชื่อเจ้าของสัตว์เลี้ยง ชื่อและข้อมูลแมว รูปภาพโปรไฟล์</p>
          <p><strong>ข้อมูลการใช้งาน:</strong> โพสต์ ความคิดเห็น ปฏิกิริยา การติดตาม ประวัติการสั่งซื้อ</p>
          <p><strong>ข้อมูลทางเทคนิค:</strong> เวลาเข้าสู่ระบบ IP address (ไม่จัดเก็บถาวร) ข้อมูล session</p>
          <p><strong>คุกกี้:</strong> Session cookie (จำเป็นต่อการใช้งาน) และคุกกี้วิเคราะห์ (ต้องได้รับความยินยอม)</p>
        </Section>

        <Section title="วัตถุประสงค์ในการใช้ข้อมูล">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>ให้บริการ Social Feed และ Marketplace สำหรับสัตว์เลี้ยง</li>
            <li>ประมวลผลคำสั่งซื้อและการชำระเงิน</li>
            <li>ปรับปรุงประสบการณ์การใช้งานและความปลอดภัย</li>
            <li>ส่งการแจ้งเตือนที่เกี่ยวข้องกับบัญชีของคุณ</li>
            <li>วิเคราะห์การใช้งาน (เฉพาะเมื่อได้รับความยินยอม)</li>
          </ul>
        </Section>

        <Section title="การแบ่งปันข้อมูล">
          <p>เราไม่ขายข้อมูลส่วนตัวของคุณให้บุคคลภายนอก ข้อมูลของคุณจะถูกแบ่งปันเฉพาะในกรณี:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 mt-2">
            <li>ตามที่กฎหมายกำหนด หรือตามคำสั่งศาล</li>
            <li>ข้อมูลสาธารณะที่คุณเลือกแสดงในโปรไฟล์หรือโพสต์</li>
            <li>ข้อมูลที่จำเป็นในการจัดส่งสินค้า (ชื่อ ที่อยู่ เบอร์โทร)</li>
          </ul>
        </Section>

        <Section title="สิทธิ์ของเจ้าของข้อมูล (PDPA)">
          <p>คุณมีสิทธิ์ดังต่อไปนี้ตาม PDPA:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 mt-2">
            <li><strong>สิทธิ์เข้าถึง:</strong> ดูข้อมูลส่วนตัวที่เราเก็บ</li>
            <li><strong>สิทธิ์แก้ไข:</strong> แก้ไขข้อมูลที่ไม่ถูกต้องผ่านหน้าโปรไฟล์</li>
            <li><strong>สิทธิ์ลบข้อมูล:</strong> ลบบัญชีและข้อมูลทั้งหมดผ่านการตั้งค่าโปรไฟล์</li>
            <li><strong>สิทธิ์ถอนความยินยอม:</strong> ยกเลิกการติดตามผ่านการตั้งค่าคุกกี้</li>
            <li><strong>สิทธิ์คัดค้าน:</strong> คัดค้านการประมวลผลข้อมูลที่ไม่จำเป็น</li>
          </ul>
        </Section>

        <Section title="ความปลอดภัยของข้อมูล">
          <p>เราใช้มาตรการด้านความปลอดภัยได้แก่:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 mt-2">
            <li>การเข้ารหัสรหัสผ่านด้วย scrypt พร้อม salt เฉพาะผู้ใช้แต่ละคน</li>
            <li>CSRF token ป้องกันการโจมตีข้ามเว็บไซต์</li>
            <li>HTTPOnly Session Cookie ป้องกัน XSS</li>
            <li>Rate limiting ป้องกัน Brute Force attack</li>
          </ul>
        </Section>

        <Section title="การเก็บรักษาข้อมูล">
          <p>เราเก็บข้อมูลของคุณตลอดระยะเวลาที่บัญชียังใช้งานอยู่ เมื่อคุณลบบัญชี ข้อมูลส่วนตัวและโพสต์ทั้งหมดจะถูกลบภายใน 30 วัน ยกเว้นข้อมูลที่ต้องเก็บตามกฎหมาย เช่น บันทึกธุรกรรม</p>
        </Section>

        <Section title="ติดต่อเรา">
          <p>หากมีคำถามเกี่ยวกับนโยบายนี้ กรุณาติดต่อ:</p>
          <p className="mt-2 font-medium text-[#4267B2]">admin@catbook.com</p>
        </Section>

        <div className="mt-8 pt-6 border-t border-[#dddfe2] flex flex-col sm:flex-row gap-3">
          <Link to="/terms" className="text-[#4267B2] hover:underline text-sm font-medium">
            ข้อกำหนดการใช้งาน →
          </Link>
          <Link to="/" className="text-[#65676B] hover:underline text-sm">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  </div>
);

export default PrivacyPage;
