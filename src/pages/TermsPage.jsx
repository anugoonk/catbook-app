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

const TermsPage = () => (
  <div className="min-h-screen bg-[#f0f2f5]">
    <div className="bg-[#4267B2] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <div className="bg-white/20 p-2.5 rounded-full">
            <PawIcon className="w-6 h-6 text-white" />
          </div>
        </Link>
        <div>
          <h1 className="text-[26px] font-black">ข้อกำหนดการใช้งาน</h1>
          <p className="text-blue-200 text-sm mt-0.5">มีผลบังคับใช้ตั้งแต่ 1 มิถุนายน 2568</p>
        </div>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8">

        <p className="text-[#65676B] text-[15px] leading-relaxed mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          โปรดอ่านข้อกำหนดนี้อย่างละเอียดก่อนใช้งาน CatBook การที่คุณใช้งานแพลตฟอร์มของเราถือว่าคุณยอมรับข้อกำหนดเหล่านี้ทั้งหมด
        </p>

        <Section title="การยอมรับข้อกำหนด">
          <p>การลงทะเบียนหรือใช้งาน CatBook หมายความว่าคุณยอมรับข้อกำหนดการใช้งานนี้ หากคุณไม่ยอมรับ กรุณางดใช้งานแพลตฟอร์ม</p>
        </Section>

        <Section title="การใช้งานที่ได้รับอนุญาต">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>ใช้งานเพื่อวัตถุประสงค์ส่วนตัวและชุมชนสัตว์เลี้ยง</li>
            <li>แบ่งปันเนื้อหาที่เกี่ยวกับสัตว์เลี้ยงในเชิงบวก</li>
            <li>ซื้อขายสินค้าที่ถูกกฎหมายในส่วน Marketplace</li>
            <li>ใช้งานในนามส่วนตัว ไม่ใช่เชิงพาณิชย์ขนาดใหญ่</li>
          </ul>
        </Section>

        <Section title="ข้อห้าม">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>โพสต์เนื้อหาที่ผิดกฎหมาย ลามกอนาจาร หรือก่อให้เกิดความเกลียดชัง</li>
            <li>รบกวน คุกคาม หรือสร้างความเดือดร้อนให้แก่ผู้ใช้อื่น</li>
            <li>ปลอมตัวเป็นบุคคลอื่นหรือองค์กรอื่น</li>
            <li>เผยแพร่ข้อมูลเท็จหรือข้อมูลที่อาจก่อให้เกิดความเข้าใจผิด</li>
            <li>พยายามเข้าถึงระบบหรือข้อมูลโดยไม่ได้รับอนุญาต</li>
            <li>ใช้ Bot หรือสคริปต์อัตโนมัติในการโต้ตอบกับแพลตฟอร์ม</li>
            <li>ขายสัตว์เลี้ยงที่ได้มาโดยผิดกฎหมาย</li>
          </ul>
        </Section>

        <Section title="เนื้อหาของผู้ใช้">
          <p>คุณเป็นเจ้าของเนื้อหาที่โพสต์ แต่ให้สิทธิ์ CatBook ในการแสดง แจกจ่าย และใช้เนื้อหาดังกล่าวในแพลตฟอร์ม เราสงวนสิทธิ์ในการลบเนื้อหาที่ละเมิดข้อกำหนดนี้โดยไม่ต้องแจ้งล่วงหน้า</p>
        </Section>

        <Section title="Marketplace และการซื้อขาย">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>ผู้ขายรับผิดชอบต่อความถูกต้องของข้อมูลสินค้า</li>
            <li>CatBook ไม่รับผิดชอบต่อข้อพิพาทระหว่างผู้ซื้อและผู้ขาย</li>
            <li>ห้ามขายสัตว์เลี้ยงผ่านแพลตฟอร์มโดยตรง (เฉพาะบริการ Adoption)</li>
            <li>ราคาสินค้าต้องแสดงในสกุลเงินบาทไทย (THB)</li>
          </ul>
        </Section>

        <Section title="การระงับและยกเลิกบัญชี">
          <p>เราสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดนี้ คุณสามารถลบบัญชีของตนเองได้ทุกเมื่อผ่านหน้าโปรไฟล์</p>
        </Section>

        <Section title="ข้อจำกัดความรับผิด">
          <p>CatBook ให้บริการ "ตามสภาพที่เป็นอยู่" และไม่รับประกันความต่อเนื่องหรือความสมบูรณ์ของบริการ เราไม่รับผิดชอบต่อความเสียหายที่เกิดจากการใช้งานหรือไม่สามารถใช้งานแพลตฟอร์มได้</p>
        </Section>

        <Section title="กฎหมายที่ใช้บังคับ">
          <p>ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดๆ ให้อยู่ในเขตอำนาจของศาลไทย</p>
        </Section>

        <Section title="การเปลี่ยนแปลงข้อกำหนด">
          <p>เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การใช้งานต่อเนื่องหลังจากการเปลี่ยนแปลงถือว่าคุณยอมรับข้อกำหนดใหม่</p>
        </Section>

        <Section title="ติดต่อเรา">
          <p className="font-medium text-[#4267B2]">admin@catbook.com</p>
        </Section>

        <div className="mt-8 pt-6 border-t border-[#dddfe2] flex flex-col sm:flex-row gap-3">
          <Link to="/privacy" className="text-[#4267B2] hover:underline text-sm font-medium">
            นโยบายความเป็นส่วนตัว →
          </Link>
          <Link to="/" className="text-[#65676B] hover:underline text-sm">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  </div>
);

export default TermsPage;
