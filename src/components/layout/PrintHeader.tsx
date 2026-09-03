import React from 'react';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`print-only mb-6 border-b-2 border-emerald-800 pb-4 text-center ${className}`}>
      <div className="flex justify-between items-start text-xs text-neutral-600 mb-2">
        <div className="text-right">
          <p className="font-bold text-neutral-800">المملكة المغربية</p>
          <p>وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
          <p>الأكاديمية الجهوية للتربية والتكوين</p>
          <p>المديرية الإقليمية</p>
        </div>
        <div className="text-center px-4">
          <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center rounded-full border border-emerald-700/30 text-emerald-800 font-bold text-lg">
            🇲🇦
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⴱ</p>
        </div>
        <div className="text-left">
          <p className="font-bold text-neutral-800">الموسم الدراسي: 2026-2027</p>
          <p>مدرسة ابن خلدون الابتدائية</p>
          <p>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-MA')}</p>
        </div>
      </div>

      <div className="mt-3">
        <h1 className="text-xl font-black text-emerald-950 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm font-medium text-neutral-700 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
