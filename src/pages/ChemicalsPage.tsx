import { Printer } from 'lucide-react';

import { ChemicalCard } from '@/components/chemicals/ChemicalCard';

import { localizedText } from '@/data/repositories';

import { useChemicals, useLanguage } from '@/hooks';

import '@/components/chemicals/chemicals-page.css';

export function ChemicalsPage() {
  const { language, t } = useLanguage();

  const { chemicals } = useChemicals();

  const labels = {
    chemical: t('chemicals.table.chemical'),

    code: t('chemicals.table.code'),

    category: t('chemicals.table.category'),

    dosage: t('chemicals.sections.dosage'),

    ph: t('chemicals.table.ph'),

    form: t('chemicals.table.form'),
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="luxury-page-shell chemicals-page mx-auto">
      <header className="chemicals-page__header">
        <div className="chemicals-page__header-top">
          <div className="chemicals-page__intro">
            <p className="luxury-page-eyebrow">{t('chemicals.eyebrow')}</p>

            <h1 className="luxury-page-title">{t('nav.chemicals')}</h1>

            <p className="luxury-page-subtitle">{t('chemicals.subtitle')}</p>
          </div>

          <button
            className="luxury-print-btn chemicals-page__print"
            onClick={handlePrint}
            type="button"
          >
            <Printer
              aria-hidden="true"
              className="luxury-print-btn__icon"
              strokeWidth={1.75}
            />

            {t('chemicals.print')}
          </button>
        </div>
      </header>

      <hr aria-hidden="true" className="luxury-section-divider" />

      <div className="chemicals-page__grid">
        {chemicals.map((chemical) => (
          <ChemicalCard chemical={chemical} key={chemical.id} />
        ))}
      </div>

      <hr aria-hidden="true" className="luxury-section-divider" />

      <section className="chemicals-page__table-section">
        <h2 className="chemicals-page__table-title">
          {t('chemicals.tableTitle')}
        </h2>

        <div className="luxury-table-wrap chemicals-page__table">
          <table className="luxury-table luxury-table--cards">
            <thead>
              <tr>
                <th scope="col">{labels.chemical}</th>

                <th scope="col">{labels.code}</th>

                <th scope="col">{labels.category}</th>

                <th scope="col">{labels.dosage}</th>

                <th scope="col">{labels.ph}</th>

                <th scope="col">{labels.form}</th>
              </tr>
            </thead>

            <tbody>
              {chemicals.map((chemical) => {
                const phRow = chemical.technicalInfo.find(
                  (row) => row.key === 'ph',
                );

                const formRow = chemical.technicalInfo.find(
                  (row) => row.key === 'form',
                );

                return (
                  <tr key={chemical.id}>
                    <td data-label={labels.chemical}>
                      {localizedText(chemical.name, language)}
                    </td>

                    <td data-label={labels.code}>{chemical.productCode}</td>

                    <td data-label={labels.category}>
                      <span className="chemicals-page__table-badge">
                        {localizedText(chemical.category, language)}
                      </span>
                    </td>

                    <td data-label={labels.dosage}>
                      {localizedText(chemical.dosage, language)}
                    </td>

                    <td data-label={labels.ph}>
                      {phRow ? localizedText(phRow.value, language) : '—'}
                    </td>

                    <td data-label={labels.form}>
                      {formRow ? localizedText(formRow.value, language) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
