import { useEffect, useState, type FormEvent } from 'react';
import { Camera as CameraIcon, Image as ImageIcon, ScanLine } from 'lucide-react';
import type { ClientProductRecord, ClientRemoteUnitSummary } from '@smart-pos/client-data';

import { scanBarcode } from '../../lib/barcode-scanner.js';
import { businessTypeOptions, suggestedUnitsFor, type BusinessType } from '../../lib/business-type-units.js';
import { capturePhoto } from '../../lib/product-photo.js';
import { toClientProductRecord } from '../../lib/product-view-mapping.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { IconButton } from '../common/IconButton.js';
import { Modal } from '../common/Modal.js';

type AddEditProductModalProps = {
  onClose: () => void;
  onSaved: () => void;
  product?: ClientProductRecord;
};

const inputClassName =
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500';

const chipClassName = (selected: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
    selected ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line bg-surface text-ink-muted'
  }`;

export const AddEditProductModal = ({ onClose, onSaved, product }: AddEditProductModalProps) => {
  const { refreshSettings, remoteApi, settings, store, terminalContext } = usePosContext();
  const isEditing = Boolean(product);

  const [name, setName] = useState(product?.name ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [price, setPrice] = useState(product ? String(product.sellingPrice) : '');
  const [businessType, setBusinessType] = useState(settings.businessType as BusinessType);
  const [unitCode, setUnitCode] = useState(product?.unitCode ?? suggestedUnitsFor(settings.businessType)[0]?.code ?? 'PCS');
  const [units, setUnits] = useState<ClientRemoteUnitSummary[]>([]);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl);

  const [changingBusinessType, setChangingBusinessType] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void remoteApi.listUnits({ businessId: terminalContext.businessId }).then(setUnits);
  }, [remoteApi, terminalContext.businessId]);

  const handleBusinessTypeSelect = async (nextType: BusinessType) => {
    if (nextType === businessType || changingBusinessType) {
      return;
    }

    setChangingBusinessType(true);
    setError(null);
    try {
      await remoteApi.updateBusinessSettings({
        businessId: terminalContext.businessId,
        businessType: nextType
      });
      await refreshSettings();
      const nextUnits = await remoteApi.listUnits({ businessId: terminalContext.businessId });
      setUnits(nextUnits);
      setBusinessType(nextType);
      setUnitCode(suggestedUnitsFor(nextType)[0]?.code ?? 'PCS');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update business type');
    } finally {
      setChangingBusinessType(false);
    }
  };

  const handleCapturePhoto = async (source: 'camera' | 'gallery') => {
    setError(null);
    try {
      const captured = await capturePhoto(source);
      if (!captured) {
        return;
      }

      setImagePreview(captured.webPath);
      setUploadingPhoto(true);
      const uploaded = await remoteApi.uploadProductImage(captured.blob, `product-${Date.now()}.jpg`);
      setImageUrl(uploaded.url);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (!/cancel/i.test(message)) {
        setError(message || 'Could not capture a photo');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleScanBarcode = async () => {
    setError(null);
    setScanning(true);
    try {
      const value = await scanBarcode();
      if (value) {
        setBarcode(value);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan a barcode');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const unitId = units.find((unit) => unit.code === unitCode)?.id;
      const payload = {
        barcode: barcode.trim() || undefined,
        imageUrl,
        name: name.trim(),
        sellingPrice: Number(price) || 0,
        unitId
      };

      const result =
        isEditing && product
          ? await remoteApi.updateProduct(product.id, payload)
          : await remoteApi.createProduct({ ...payload, businessId: terminalContext.businessId });

      await store.products.upsertProducts([toClientProductRecord(result)]);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this product');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 &&
    Number(price) > 0 &&
    !saving &&
    !uploadingPhoto &&
    !scanning &&
    !changingBusinessType;

  return (
    <Modal onClose={onClose} open title={isEditing ? 'Edit product' : 'Add product'} widthClassName="max-w-lg">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex items-center gap-4">
          {imagePreview ? (
            <img alt="" className="h-20 w-20 rounded-2xl object-cover" src={imagePreview} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-sunken text-ink-faint">
              <ImageIcon size={28} />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <Button
                disabled={uploadingPhoto}
                icon={<CameraIcon size={16} />}
                onClick={() => void handleCapturePhoto('camera')}
                size="sm"
                type="button"
                variant="outline"
              >
                Take photo
              </Button>
              <Button
                disabled={uploadingPhoto}
                icon={<ImageIcon size={16} />}
                onClick={() => void handleCapturePhoto('gallery')}
                size="sm"
                type="button"
                variant="outline"
              >
                Gallery
              </Button>
            </div>
            {uploadingPhoto && <p className="text-xs font-medium text-ink-faint">Uploading photo…</p>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Business type</p>
          <div className="flex flex-wrap gap-2">
            {businessTypeOptions.map((option) => (
              <button
                className={chipClassName(option.value === businessType)}
                disabled={changingBusinessType}
                key={option.value}
                onClick={() => void handleBusinessTypeSelect(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <input
          className={inputClassName}
          onChange={(event) => setName(event.target.value)}
          placeholder="Product name"
          value={name}
        />

        <div className="flex gap-2">
          <input
            className={inputClassName}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Barcode (optional)"
            value={barcode}
          />
          <IconButton
            disabled={scanning}
            label="Scan barcode"
            onClick={() => void handleScanBarcode()}
            tone="brand"
            type="button"
          >
            <ScanLine size={20} />
          </IconButton>
        </div>

        <input
          className={inputClassName}
          inputMode="decimal"
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Price"
          value={price}
        />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Priced by</p>
          <div className="flex flex-wrap gap-2">
            {suggestedUnitsFor(businessType).map((unit) => (
              <button
                className={chipClassName(unit.code === unitCode)}
                key={unit.code}
                onClick={() => setUnitCode(unit.code)}
                type="button"
              >
                {unit.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <Button disabled={!canSubmit} fullWidth size="lg" type="submit" variant="brand">
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
        </Button>
      </form>
    </Modal>
  );
};
