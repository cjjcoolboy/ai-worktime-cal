interface HeaderProps {
  onOpenApiKey: () => void;
  apiKeyConfigured: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenApiKey, apiKeyConfigured }) => {
  return (
    <header className="header">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
                  <h1 className="h4 mb-0">📊 出勤计算器</h1>
          <button 
            className={`btn btn-sm ${apiKeyConfigured ? 'btn-success' : 'btn-outline-warning'}`}
            onClick={onOpenApiKey}
          >
            {apiKeyConfigured ? '✓ API已配置' : '⚠ 配置API Key'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
