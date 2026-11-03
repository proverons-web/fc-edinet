"use client";

import { useState } from "react";
import MatchCenterSubmitButton from "./MatchCenterSubmitButton";

/** Confirmation affects only the publish form. It does not modify match data. */
export default function MatchPublishConfirmation({ available }: { available: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="mc297PublishConfirmation" data-mc-confirmation>
      <label>
        <input type="checkbox" name="review_confirmed" value="yes" checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Я сверил итоговый счёт, голы в хронологии и корректность данных протокола.</span>
      </label>
      <MatchCenterSubmitButton className="primaryButton" pendingText="Публикация…" disabled={!available || !confirmed}>
        Опубликовать протокол
      </MatchCenterSubmitButton>
    </div>
  );
}
