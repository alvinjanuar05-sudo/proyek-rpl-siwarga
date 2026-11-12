
import plasmaIcon from '../../assets/icon_navbar/icon_plasma.svg';

const Hero = () => {
  return (
    <section style={{ width: '100%', maxWidth: '100vw', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 100px 16px', position: 'relative', overflowX: 'hidden', boxSizing: 'border-box' }}>
      
      {/* Gambar Icon Plasma (Nempel Mentok Kiri Layar) */}
      <img 
        src={plasmaIcon} 
        alt="Plasma Effect" 
        style={{ 
          position: 'absolute', 
          width: '100%', 
          maxWidth: '900px', 
          height: 'auto', 
          objectFit: 'contain', 
          opacity: 0.85,
          left: 0,
          bottom: '20px',
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />

      {/* Teks SVARA */}
      <div style={{ color: '#000000', fontSize: '64px', fontWeight: 'normal', fontFamily: 'Inter, sans-serif', letterSpacing: '2px', marginBottom: '8px', zIndex: 2, textAlign: 'center' }}>
        SVARA
      </div>

      {/* Sub-teks Smart Civic */}
      <div style={{ color: '#000000', fontSize: '14px', fontWeight: 'normal', fontFamily: 'Inter, sans-serif', opacity: 0.8, marginBottom: '24px', zIndex: 2, textAlign: 'center' }}>
        Smart Civic Information &amp; Regional Assistant
      </div>

      {/* Spacer Container */}
      <div style={{ width: '100%', maxWidth: '977px', height: '220px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible', zIndex: 1, boxSizing: 'border-box' }} />

    </section>
  );
};

export default Hero;