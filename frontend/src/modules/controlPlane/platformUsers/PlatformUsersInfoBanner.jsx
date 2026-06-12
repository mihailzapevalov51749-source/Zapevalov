export default function PlatformUsersInfoBanner() {
  return (
    <aside className="platform-users-info-banner" role="note">
      <span className="platform-users-info-banner__icon" aria-hidden="true">
        i
      </span>
      <p className="platform-users-info-banner__text">
        Пользователи платформы имеют доступ к Control Plane и управлению ЯсноПро.
        <br />
        Пользователи клиентских компаний управляются внутри карточек компаний.
      </p>
    </aside>
  );
}
