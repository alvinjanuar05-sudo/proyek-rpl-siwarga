import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { TemplateSurat } from './ChatKatalogOptions';
import { useToast } from '../../context/ToastContext';

const MAP_LABEL_WARGA: Record<string, string> = {
  nama_warga: 'Nama Lengkap Pemohon',
  nik_warga: 'NIK Pemohon',
  no_kk_warga: 'Nomor Kartu Keluarga (KK)',
  no_hp: 'No. HP / WhatsApp (Aktif)',
  email_warga: 'Email Pemohon',
  tempat_tgl_lahir: 'Tempat & Tgl Lahir',
  jenis_kelamin: 'Jenis Kelamin',
  agama: 'Agama',
  status_perkawinan: 'Status Perkawinan',
  kewarganegaraan: 'Kewarganegaraan (WNI/WNA)',
  pendidikan_terakhir: 'Pendidikan Terakhir',
  pekerjaan: 'Pekerjaan Pemohon',
  penghasilan_pemohon: 'Penghasilan Pemohon (Rp)',
  sekolah_univ: 'Sekolah / Perguruan Tinggi',
  alamat_warga: 'Alamat Domisili',
  rt_rw_warga: 'RT / RW Domisili',
  dusun: 'Dusun / Blok',
  keperluan: 'Tujuan / Keperluan Surat',
};

const MAP_LABEL_ORTU: Record<string, string> = {
  nama_ortu: 'Nama Orang Tua / Wali',
  nik_ortu: 'NIK Orang Tua',
  no_kk_ortu: 'Nomor Kartu Keluarga (KK)',
  no_hp_ortu: 'No. HP / WhatsApp Ortu',
  pekerjaan_ortu: 'Pekerjaan Orang Tua',
  penghasilan_ortu: 'Penghasilan / Bulan (Rp)',
  alamat_ortu: 'Alamat Lengkap Ortu',
  rt_rw_ortu: 'RT / RW Ortu',
};

const LIST_AGAMA = [
  'Islam',
  'Kristen Protestan',
  'Katolik',
  'Hindu',
  'Buddha',
  'Khonghucu',
  'Kepercayaan Kepada Tuhan YME',
];

const LIST_JENIS_KELAMIN = ['Laki-laki', 'Perempuan'];

const OPSI_KEPERLUAN_BERTINGKAT: Record<string, string[]> = {
  'Pendidikan & Sekolah': [
    'Persyaratan Beasiswa',
    'Keringanan Biaya Pendidikan / UKT',
    'Persyaratan Pendaftaran Sekolah / Kampus',
    'Permohonan Kartu Indonesia Pintar (KIP)',
  ],
  'Kesehatan & Bantuan Sosial': [
    'Pengurusan BPJS Kesehatan / KIS Gratis',
    'Persyaratan Bantuan Sosial (PKH/Sembako/BLT)',
    'Rujukan Pengobatan / Rumah Sakit',
  ],
  'Pekerjaan & Usaha': [
    'Pengantar Surat Keterangan Catatan Kepolisian (SKCK)',
    'Persyaratan Melamar Pekerjaan',
    'Pengajuan Kredit / Modal Usaha Bank (KUR)',
    'Izin Operasional Tempat Usaha',
  ],
  'Administrasi Umum': [
    'Persyaratan KTP-el / Kartu Keluarga',
    'Pengurusan Surat Pindah / Datang Domisili',
    'Persyaratan Buka Rekening Bank',
  ],
  Lainnya: ['Tulis Keperluan Spesifik Lainnya...'],
};

interface SuratFormWidgetProps {
  templateData: TemplateSurat;
  currentUser: any;
  handleInputChangeWarga: (templateId: string, fieldKey: string, value: string) => void;
  handleSubmitPengajuanSurat: (template: TemplateSurat) => void;
}

export const SuratFormWidget: React.FC<SuratFormWidgetProps> = ({
  templateData,
  currentUser,
  handleInputChangeWarga,
  handleSubmitPengajuanSurat,
}) => {
  const { showToast } = useToast();
  const [selectedKategoriUtama, setSelectedKategoriUtama] = useState('');
  const [selectedSubKategori, setSelectedSubKategori] = useState('');
  const [customTextKeperluan, setCustomTextKeperluan] = useState('');

  // Local state Modal Konfirmasi Pop-up
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [formSummary, setFormSummary] = useState<Record<string, any>>({});

  const handleKategoriUtamaChange = (fieldKey: string, val: string) => {
    setSelectedKategoriUtama(val);
    setSelectedSubKategori('');
    setCustomTextKeperluan('');

    // Jika pilih 'Lainnya', kosongkan nilai dlu sampai warga mengetik manual
    if (val === 'Lainnya') {
      handleInputChangeWarga(templateData.id_template, fieldKey, '');
    } else {
      handleInputChangeWarga(templateData.id_template, fieldKey, val);
    }
  };

  const handleSubKategoriChange = (fieldKey: string, val: string) => {
    setSelectedSubKategori(val);
    if (val === 'Tulis Keperluan Spesifik Lainnya...') {
      // Kosongkan nilai dlu sampai warga mengetik di input manual
      handleInputChangeWarga(templateData.id_template, fieldKey, customTextKeperluan);
      return;
    }

    // Jika Kategori Utama = 'Lainnya', hanya gunakan val sub-kategori
    const fullValue =
      selectedKategoriUtama === 'Lainnya' ? val : `${selectedKategoriUtama} - ${val}`;

    handleInputChangeWarga(templateData.id_template, fieldKey, fullValue);
  };

  const handleCustomTextChange = (fieldKey: string, val: string) => {
    setCustomTextKeperluan(val);

    // JIKA KATEGORI UTAMA/SUB ADALAH 'Lainnya', KIRIM MURNI INPUTAN WARGA (TANPA TEKS "Lainnya")
    let fullValue = val;

    if (
      selectedKategoriUtama !== 'Lainnya' &&
      selectedSubKategori !== 'Tulis Keperluan Spesifik Lainnya...'
    ) {
      if (selectedSubKategori) {
        fullValue = `${selectedKategoriUtama} - ${val}`;
      } else if (selectedKategoriUtama) {
        fullValue = `${selectedKategoriUtama}: ${val}`;
      }
    }

    handleInputChangeWarga(templateData.id_template, fieldKey, fullValue);
  };

  // 🎯 TRIGGER MODAL KONFIRMASI (Validasi Awal & Pengumpulan Ringkasan)
  const handleOpenConfirmation = () => {
    const emailInput = document.querySelector(`input[type="email"]`) as HTMLInputElement;
    const emailValue = emailInput?.value?.trim() || currentUser?.email || '';

    if (!emailValue) {
      showToast('Mohon isi Email Aktif Anda untuk menerima hasil verifikasi surat!', 'warning');
      return;
    }

    const namaValue = currentUser?.nama || currentUser?.nama_lengkap || 'Warga';
    const nikValue = currentUser?.nik || '-';

    const alamatInput = document.querySelector(
      `input[placeholder*="Alamat"]`
    ) as HTMLInputElement;
    const alamatValue =
      alamatInput?.value?.trim() ||
      currentUser?.alamat_lengkap ||
      `${currentUser?.dusun || 'Dusun 1'} RT ${currentUser?.nomor_rt || '01'} / RW ${
        currentUser?.nomor_rw || '01'
      }`;

    let keperluanVal = selectedSubKategori;
    if (
      selectedKategoriUtama === 'Lainnya' ||
      selectedSubKategori === 'Tulis Keperluan Spesifik Lainnya...'
    ) {
      keperluanVal = customTextKeperluan || 'Keperluan Spesifik';
    } else if (selectedKategoriUtama && selectedSubKategori) {
      keperluanVal = `${selectedKategoriUtama} - ${selectedSubKategori}`;
    } else if (selectedKategoriUtama) {
      keperluanVal = selectedKategoriUtama;
    }

    setFormSummary({
      nama: namaValue,
      nik: nikValue,
      alamat: alamatValue,
      email: emailValue,
      keperluan: keperluanVal || 'Administrasi Desa',
    });

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsConfirmModalOpen(false);
    handleSubmitPengajuanSurat(templateData);
  };

  const renderKeperluanDropdown = (fieldKey: string, labelText: string) => {
    return (
      <div className="space-y-2 bg-white p-2 rounded-lg border border-black/10 max-w-full overflow-hidden">
        <label className="font-medium text-black/80 block text-[10.5px]">
          {labelText} <span className="text-black/40">*</span>
        </label>

        <select
          value={selectedKategoriUtama}
          onChange={(e) => handleKategoriUtamaChange(fieldKey, e.target.value)}
          className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
        >
          <option value="">-- Pilih Kategori Tujuan --</option>
          {Object.keys(OPSI_KEPERLUAN_BERTINGKAT).map((kat) => (
            <option key={kat} value={kat}>
              {kat}
            </option>
          ))}
        </select>

        {selectedKategoriUtama && OPSI_KEPERLUAN_BERTINGKAT[selectedKategoriUtama] && (
          <select
            value={selectedSubKategori}
            onChange={(e) => handleSubKategoriChange(fieldKey, e.target.value)}
            className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer mt-1"
          >
            <option value="">-- Pilih Detail Keperluan --</option>
            {OPSI_KEPERLUAN_BERTINGKAT[selectedKategoriUtama].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        )}

        {(selectedKategoriUtama === 'Lainnya' ||
          selectedSubKategori === 'Tulis Keperluan Spesifik Lainnya...') && (
          <input
            type="text"
            value={customTextKeperluan}
            placeholder="Tuliskan keperluan Anda..."
            onChange={(e) => handleCustomTextChange(fieldKey, e.target.value)}
            className="w-full bg-white border-b border-black/60 py-1 px-1.5 text-[11px] text-black outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded mt-1"
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mt-2.5 rounded-xl border border-black/10 bg-white p-2.5 sm:p-3.5 text-xs space-y-3 text-black font-['Product_Sans',sans-serif] max-w-full overflow-hidden">
        <div className="border-b border-black/10 pb-2 flex items-center justify-between gap-2">
          <span className="font-medium text-black text-[11px] sm:text-xs truncate">
            Isian Formulir Resmi Desa
          </span>
          <span className="text-[9px] bg-neutral-100 text-black/70 px-1.5 py-0.5 rounded font-mono border border-black/5 shrink-0">
            {templateData.kode_surat}
          </span>
        </div>

        {/* EMAIL MANDATORY */}
        <div className="bg-neutral-50 p-2.5 rounded-lg border border-black/10 space-y-1">
          <label className="font-medium text-black block text-[11px]">
            Email Aktif Pemohon <span className="text-black/40">*</span>
          </label>
          <input
            type="email"
            defaultValue={currentUser?.email || ''}
            placeholder="Masukkan Email"
            onChange={(e) =>
              handleInputChangeWarga(templateData.id_template, 'email_warga', e.target.value)
            }
            className="w-full bg-white border-b border-black/60 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded"
          />
        </div>

        {/* BLOK DATA ORANG TUA / WALI (JIKA MULTI STRUCT) */}
        {templateData.tipe_struktur === 'multi_ortu_anak' && (
          <div className="space-y-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
            <span className="font-medium text-black text-[11px] block border-b border-black/10 pb-1">
              Data Orang Tua / Wali
            </span>

            {templateData.field_ortu?.map((fieldKey) => {
              if (fieldKey === 'jenis_kelamin') {
                return (
                  <div key={fieldKey} className="space-y-0.5">
                    <label className="font-medium text-black/80 block text-[10.5px]">
                      {MAP_LABEL_ORTU[fieldKey] || fieldKey}
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                      }
                      className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Jenis Kelamin --
                      </option>
                      {LIST_JENIS_KELAMIN.map((jk) => (
                        <option key={jk} value={jk}>
                          {jk}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (fieldKey === 'agama') {
                return (
                  <div key={fieldKey} className="space-y-0.5">
                    <label className="font-medium text-black/80 block text-[10.5px]">
                      {MAP_LABEL_ORTU[fieldKey] || fieldKey}
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                      }
                      className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Agama --
                      </option>
                      {LIST_AGAMA.map((agm) => (
                        <option key={agm} value={agm}>
                          {agm}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={fieldKey} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {MAP_LABEL_ORTU[fieldKey] || fieldKey}
                  </label>
                  <input
                    type={fieldKey.includes('penghasilan') ? 'number' : 'text'}
                    placeholder={`Masukkan ${MAP_LABEL_ORTU[fieldKey] || fieldKey}`}
                    onChange={(e) =>
                      handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                    }
                    className="w-full bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded"
                  />
                </div>
              );
            })}

            {templateData.custom_fields
              ?.filter((cf) => cf.section === 'orang_tua')
              .map((cf) => (
                <div key={cf.id} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {cf.label} {cf.required && <span className="text-black/40">*</span>}
                  </label>
                  {cf.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      placeholder={cf.placeholder || `Masukkan ${cf.label}`}
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full bg-white border border-black/20 p-1.5 text-[11px] text-black outline-none focus:border-black placeholder:text-black/30 resize-none font-['Product_Sans'] rounded"
                    />
                  ) : (
                    <input
                      type={cf.type === 'number' ? 'number' : 'text'}
                      placeholder={cf.placeholder || `Masukkan ${cf.label}`}
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded"
                    />
                  )}
                </div>
              ))}
          </div>
        )}

        {/* BLOK DATA PEMOHON */}
        <div className="space-y-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
          <span className="font-medium text-black text-[11px] block border-b border-black/10 pb-1">
            Data Pemohon
          </span>

          {templateData.field_warga?.map((fieldKey) => {
            if (fieldKey === 'email_warga') return null;

            if (fieldKey === 'keperluan') {
              return (
                <React.Fragment key={fieldKey}>
                  {renderKeperluanDropdown(
                    fieldKey,
                    MAP_LABEL_WARGA[fieldKey] || 'Tujuan / Keperluan Surat'
                  )}
                </React.Fragment>
              );
            }

            if (fieldKey === 'jenis_kelamin') {
              return (
                <div key={fieldKey} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {MAP_LABEL_WARGA[fieldKey] || fieldKey}
                  </label>
                  <select
                    defaultValue={currentUser?.jenis_kelamin || ''}
                    onChange={(e) =>
                      handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                    }
                    className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Pilih Jenis Kelamin --
                    </option>
                    {LIST_JENIS_KELAMIN.map((jk) => (
                      <option key={jk} value={jk}>
                        {jk}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (fieldKey === 'agama') {
              return (
                <div key={fieldKey} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {MAP_LABEL_WARGA[fieldKey] || fieldKey}
                  </label>
                  <select
                    defaultValue={currentUser?.agama || ''}
                    onChange={(e) =>
                      handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                    }
                    className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Pilih Agama --
                    </option>
                    {LIST_AGAMA.map((agm) => (
                      <option key={agm} value={agm}>
                        {agm}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={fieldKey} className="space-y-0.5">
                <label className="font-medium text-black/80 block text-[10.5px]">
                  {MAP_LABEL_WARGA[fieldKey] || fieldKey}
                </label>
                <input
                  type={fieldKey.includes('penghasilan') ? 'number' : 'text'}
                  defaultValue={
                    fieldKey === 'nama_warga'
                      ? currentUser?.nama || currentUser?.nama_lengkap || ''
                      : fieldKey === 'nik_warga'
                      ? currentUser?.nik || ''
                      : ''
                  }
                  placeholder={`Masukkan ${MAP_LABEL_WARGA[fieldKey] || fieldKey}`}
                  onChange={(e) =>
                    handleInputChangeWarga(templateData.id_template, fieldKey, e.target.value)
                  }
                  className="w-full bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded"
                />
              </div>
            );
          })}

          {templateData.custom_fields
            ?.filter((cf) => cf.section === 'warga')
            .map((cf) => {
              const isKeperluanField =
                cf.id.toLowerCase().includes('keperluan') ||
                cf.label.toLowerCase().includes('keperluan') ||
                cf.label.toLowerCase().includes('tujuan');

              if (isKeperluanField) {
                return (
                  <React.Fragment key={cf.id}>
                    {renderKeperluanDropdown(cf.id, cf.label)}
                  </React.Fragment>
                );
              }

              const isJenisKelaminCustom =
                cf.id.toLowerCase().includes('jenis_kelamin') ||
                cf.label.toLowerCase().includes('jenis kelamin');

              if (isJenisKelaminCustom) {
                return (
                  <div key={cf.id} className="space-y-0.5">
                    <label className="font-medium text-black/80 block text-[10.5px]">
                      {cf.label} {cf.required && <span className="text-black/40">*</span>}
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Jenis Kelamin --
                      </option>
                      {LIST_JENIS_KELAMIN.map((jk) => (
                        <option key={jk} value={jk}>
                          {jk}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const isAgamaCustom =
                cf.id.toLowerCase().includes('agama') || cf.label.toLowerCase().includes('agama');

              if (isAgamaCustom) {
                return (
                  <div key={cf.id} className="space-y-0.5">
                    <label className="font-medium text-black/80 block text-[10.5px]">
                      {cf.label} {cf.required && <span className="text-black/40">*</span>}
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full max-w-full truncate bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black font-['Product_Sans'] rounded cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih Agama --
                      </option>
                      {LIST_AGAMA.map((agm) => (
                        <option key={agm} value={agm}>
                          {agm}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={cf.id} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {cf.label} {cf.required && <span className="text-black/40">*</span>}
                  </label>
                  {cf.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      placeholder={cf.placeholder || `Masukkan ${cf.label}`}
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full bg-white border border-black/20 p-1.5 text-[11px] text-black outline-none focus:border-black placeholder:text-black/30 resize-none font-medium font-['Product_Sans'] rounded"
                    />
                  ) : (
                    <input
                      type={cf.type === 'number' ? 'number' : 'text'}
                      placeholder={cf.placeholder || `Masukkan ${cf.label}`}
                      onChange={(e) =>
                        handleInputChangeWarga(templateData.id_template, cf.id, e.target.value)
                      }
                      className="w-full bg-white border-b border-black/40 py-1 px-1.5 text-[11px] text-black font-medium outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded"
                    />
                  )}
                </div>
              );
            })}
        </div>

        {/* BLOK UPLOAD LAMPIRAN */}
        {templateData.custom_fields?.some((cf) => cf.section === 'lampiran') && (
          <div className="space-y-2 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
            <span className="font-medium text-black text-[11px] block border-b border-black/10 pb-1">
              Upload Berkas Lampiran
            </span>
            {templateData.custom_fields
              ?.filter((cf) => cf.section === 'lampiran')
              .map((cf) => (
                <div key={cf.id} className="space-y-0.5">
                  <label className="font-medium text-black/80 block text-[10.5px]">
                    {cf.label} {cf.required && <span className="text-black/40">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleInputChangeWarga(
                        templateData.id_template,
                        cf.id,
                        e.target.files?.[0]?.name || ''
                      )
                    }
                    className="block w-full text-[10.5px] text-black/60 bg-white border border-black/20 rounded p-1 cursor-pointer font-['Product_Sans']"
                  />
                </div>
              ))}
          </div>
        )}

        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={handleOpenConfirmation}
            className="w-full h-8.5 bg-neutral-800 rounded-full border border-black/10 text-white text-[11px] font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans'] shadow-xs"
          >
            Kirim Pengajuan Surat ke Admin Desa
          </button>
        </div>
      </div>

      {/* 🎯 MODAL POPUP KONFIRMASI DENGAN REACT PORTAL */}
      {isConfirmModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-black/10 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 font-['Product_Sans',sans-serif] animate-in zoom-in-95 duration-200">
              
              {/* HEADER MODAL */}
              <div className="flex items-start gap-3 border-b border-black/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-black/10 flex items-center justify-center text-neutral-800 shrink-0 text-lg">
                  📄
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Konfirmasi Pengajuan Surat
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">
                    Mohon periksa kembali data Anda sebelum diteruskan ke Admin Desa.
                  </p>
                </div>
              </div>

              {/* RINGKASAN DATA (SUMMARY CARD) */}
              <div className="bg-neutral-50 rounded-2xl p-3.5 border border-black/10 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-neutral-500 text-[11px]">Jenis Surat</span>
                  <span className="font-bold text-neutral-900 text-[11px]">{templateData.nama_surat}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-neutral-500 text-[11px]">Nama Pemohon</span>
                  <span className="font-semibold text-neutral-900 text-[11px]">{formSummary.nama}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-neutral-500 text-[11px]">NIK Pemohon</span>
                  <span className="font-mono font-semibold text-neutral-900 text-[11px]">{formSummary.nik}</span>
                </div>

                <div className="flex justify-between items-start py-1 border-b border-black/5">
                  <span className="text-neutral-500 text-[11px] shrink-0">Alamat Domisili</span>
                  <span className="font-medium text-neutral-900 text-[11px] text-right break-words pl-2">
                    {formSummary.alamat}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-black/5">
                  <span className="text-neutral-500 text-[11px]">Email Tujuan</span>
                  <span className="font-medium text-neutral-900 text-[11px]">{formSummary.email}</span>
                </div>

                <div className="flex justify-between items-start py-1">
                  <span className="text-neutral-500 text-[11px] shrink-0">Tujuan / Keperluan</span>
                  <span className="font-semibold text-neutral-800 text-[11px] text-right break-words pl-2">
                    {formSummary.keperluan}
                  </span>
                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-full border border-black/20 text-neutral-800 text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cek Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="w-1/2 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-black shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  Ya, Sudah Benar
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}
    </>
  );
};