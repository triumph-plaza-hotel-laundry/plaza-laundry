import { localizedText } from '@/data/laundry-chemicals';
import type { WashingProgram } from '@/data/washing-programs';
import { useLanguage } from '@/hooks';

type ProgramCardProps = {
  program: WashingProgram;
};

export function ProgramCard({ program }: ProgramCardProps) {
  const { language, t } = useLanguage();
  const altLanguage = language === 'ar' ? 'en' : 'ar';

  return (
    <article className="programs-card">
      <div className="programs-card__header">
        <span className="programs-card__badge">{program.id}</span>
        <div className="programs-card__titles">
          <h2 className="programs-card__title">{localizedText(program.title, language)}</h2>
          <p className="programs-card__subtitle">{localizedText(program.title, altLanguage)}</p>
        </div>
      </div>

      <div className="programs-card__chips">
        <div className="programs-chip">
          <span className="programs-chip__label">{t('programs.time')}</span>
          <span className="programs-chip__value">
            {program.durationMin} {t('programs.minutes')}
          </span>
        </div>
        <div className="programs-chip">
          <span className="programs-chip__label">{t('programs.temperature')}</span>
          <span className="programs-chip__value">
            {localizedText(program.temperatureBadge, language)}
          </span>
        </div>
      </div>

      <div className="luxury-table-wrap programs-card__table-wrap">
        <table className="luxury-table programs-card__table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t('programs.table.process')}</th>
              <th scope="col">{t('programs.waterLevel')}</th>
              <th scope="col">{t('programs.temperature')}</th>
            </tr>
          </thead>
          <tbody>
            {program.steps.map((step) => (
              <tr key={`${program.id}-${step.step}`}>
                <td>{step.step}</td>
                <td>{localizedText(step.process, language)}</td>
                <td>{step.waterLevel}</td>
                <td>{localizedText(step.temperature, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="programs-card__footer">{localizedText(program.footerNote, language)}</p>
    </article>
  );
}
