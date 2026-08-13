import Modal from './Modal.jsx';
import { services, countries } from '../data/marketplace.js';

export default function ServiceModal({ countryName, onClose, onSelectService }) {
  const country = countries.find((c) => c.name === countryName);

  return (
    <Modal open={!!countryName} onClose={onClose} title={`${countryName} Services`}>
      <div className="flex flex-col gap-4">
        {services.map((service) => (
          <button
            key={service.name}
            onClick={() => onSelectService(service, country)}
            className="flex items-center gap-4 bg-gold/8 border border-gold/15 rounded-[10px] p-6 text-left hover:bg-gold/12 hover:border-gold/30 hover:translate-x-[5px] transition-all"
          >
            <span className="w-[50px] h-[50px] min-w-[50px] rounded-[12px] bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <service.icon size={26} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-gold text-[1.1rem]">{service.name}</span>
              <span className="block text-gray-400 text-[0.85rem]">{service.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}