import { Printer } from 'lucide-react';

import { ProgramCard } from '@/components/programs/ProgramCard';

import { localizedText } from '@/data/laundry-chemicals';

import { useLanguage, usePrograms } from '@/hooks';

import '@/components/programs/programs-page.css';



export function ProgramsPage() {

  const { language, t } = useLanguage();

  const { programs } = usePrograms();

  const labels = {

    program: t('programs.table.program'),

    duration: t('programs.time'),

    temperature: t('programs.temperature'),

    steps: t('programs.table.steps'),

    note: t('programs.table.note'),

  };



  const handlePrint = () => {

    window.print();

  };



  return (

    <section className="luxury-page-shell programs-page mx-auto">

      <header className="programs-page__header">

        <div className="programs-page__header-top">

          <div className="programs-page__intro">

            <p className="luxury-page-eyebrow">{t('programs.eyebrow')}</p>

            <h1 className="luxury-page-title">{t('nav.programs')}</h1>

            <p className="luxury-page-subtitle">{t('programs.subtitle')}</p>

          </div>



          <button

            className="luxury-print-btn programs-page__print"

            onClick={handlePrint}

            type="button"

          >

            <Printer aria-hidden="true" className="luxury-print-btn__icon" strokeWidth={1.75} />

            {t('programs.print')}

          </button>

        </div>

      </header>



      <hr aria-hidden="true" className="luxury-section-divider" />



      <div className="programs-page__grid">

        {programs.map((program) => (

          <ProgramCard key={program.id} program={program} />

        ))}

      </div>



      <hr aria-hidden="true" className="luxury-section-divider" />



      <section className="programs-page__table-section">

        <h2 className="programs-page__table-title">{t('programs.tableTitle')}</h2>

        <div className="luxury-table-wrap programs-page__table">

          <table className="luxury-table luxury-table--cards">

            <thead>

              <tr>

                <th scope="col">{labels.program}</th>

                <th scope="col">{labels.duration}</th>

                <th scope="col">{labels.temperature}</th>

                <th scope="col">{labels.steps}</th>

                <th scope="col">{labels.note}</th>

              </tr>

            </thead>

            <tbody>

              {programs.map((program) => (

                <tr key={program.id}>

                  <td data-label={labels.program}>

                    {program.id}. {localizedText(program.title, language)}

                  </td>

                  <td data-label={labels.duration}>

                    {program.durationMin} {t('programs.minutes')}

                  </td>

                  <td data-label={labels.temperature}>

                    {localizedText(program.temperatureBadge, language)}

                  </td>

                  <td data-label={labels.steps}>{program.steps.length}</td>

                  <td data-label={labels.note}>{localizedText(program.footerNote, language)}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

    </section>

  );

}


