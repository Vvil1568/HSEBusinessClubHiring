import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
import { App } from 'antd';
import { palette } from '../../../theme/tokens';

interface LogoUploaderProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const MAX_LOGO_SIZE = 1024 * 1024;

export const LogoUploader = ({ value, onChange }: LogoUploaderProps) => {
  const { message } = App.useApp();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 18,
          border: `1px dashed ${palette.border}`,
          background: value ? 'transparent' : palette.surfaceMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {value ? (
          <img
            src={value}
            alt="Логотип стартапа"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: 26, color: palette.textMuted }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            if (file.size > MAX_LOGO_SIZE) {
              message.error('Логотип должен быть меньше 1 МБ');
              return Upload.LIST_IGNORE;
            }
            const reader = new FileReader();
            reader.onload = () => {
              onChange(typeof reader.result === 'string' ? reader.result : null);
            };
            reader.readAsDataURL(file);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<UploadOutlined />}>{value ? 'Заменить логотип' : 'Загрузить логотип'}</Button>
        </Upload>
        {value ? (
          <Button type="link" size="small" onClick={() => onChange(null)} style={{ padding: 0, width: 'fit-content' }}>
            Убрать логотип (будет лампочка идеи)
          </Button>
        ) : (
          <span style={{ fontSize: 12, color: palette.textMuted }}>
            PNG или JPG, до 1 МБ. Без логотипа покажем лампочку идеи.
          </span>
        )}
      </div>
    </div>
  );
};
