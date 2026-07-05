import type { LaundryChemical } from '@/data/laundry-chemicals';
import { localizedText } from '@/data/laundry-chemicals';
import { useLanguage } from '@/hooks';

type ChemicalCardProps = {
  chemical: LaundryChemical;
};

type TextSectionKey =
  | 'chemicals.sections.description'
  | 'chemicals.sections.howItWorks'
  | 'chemicals.sections.usage'
  | 'chemicals.sections.dosage'
  | 'chemicals.sections.safety'
  | 'chemicals.sections.storage';

type TextField = 'description' | 'howItWorks' | 'usage' | 'dosage' | 'safety' | 'storage';

const textSections: Array<{ key: TextSectionKey; field: TextField }> = [
  { key: 'chemicals.sections.description', field: 'description' },
  { key: 'chemicals.sections.howItWorks', field: 'howItWorks' },
  { key: 'chemicals.sections.usage', field: 'usage' },
  { key: 'chemicals.sections.dosage', field: 'dosage' },
  { key: 'chemicals.sections.safety', field: 'safety' },
  { key: 'chemicals.sections.storage', field: 'storage' },
];

export function ChemicalCard({ chemical }: ChemicalCardProps) {
  const { language, t } = useLanguage();
  const features = chemical.features[language];
  const warnings = chemical.warnings[language];

  return (
    <article className="chemicals-card">
      <div className="chemicals-card__media">
        <div className="chemicals-card__image-frame">
          <img
            alt=""
            className="chemicals-card__image"
            decoding="async"
            height={120}
            loading="lazy"
            src={chemical.image}
            width={80}
          />
        </div>
      </div>

      <div className="chemicals-card__head">
        <span className="chemicals-card__badge">
          {chemical.productCode} · {chemical.brand} · {localizedText(chemical.category, language)}
        </span>
        <h2 className="chemicals-card__name">{localizedText(chemical.name, language)}</h2>
      </div>

      <div className="chemicals-card__sections">
        {textSections.map(({ key, field }) => (
          <section className="chemicals-card__section" key={key}>
            <h3 className="chemicals-card__section-title">{t(key)}</h3>
            <p className="chemicals-card__section-text">
              {localizedText(chemical[field], language)}
            </p>
          </section>
        ))}

        {features.length > 0 ? (
          <section className="chemicals-card__section">
            <h3 className="chemicals-card__section-title">{t('chemicals.sections.features')}</h3>
            <ul className="chemicals-card__list">
              {features.map((item) => (
                <li className="chemicals-card__list-item" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {warnings.length > 0 ? (
          <section className="chemicals-card__section">
            <h3 className="chemicals-card__section-title">{t('chemicals.sections.warnings')}</h3>
            <ul className="chemicals-card__list chemicals-card__list--warnings">
              {warnings.map((item) => (
                <li className="chemicals-card__list-item" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="chemicals-card__section">
          <h3 className="chemicals-card__section-title">{t('chemicals.sections.technical')}</h3>
          <div className="chemicals-card__tech-table-wrap">
            <table className="chemicals-card__tech-table">
              <tbody>
                {chemical.technicalInfo.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{localizedText(row.label, language)}</th>
                    <td>{localizedText(row.value, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chemicals-card__tech-note">
            {localizedText(chemical.technicalFooterNote, language)}
          </p>
        </section>
      </div>
    </article>
  );
}
