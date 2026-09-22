import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera as CameraIcon, Image as ImageIcon, Plus, ScanLine, Trash2 } from 'lucide-react';
import type { ClientProductRecord, ClientRemoteTaxProfileView, ClientRemoteUnitSummary } from '@smart-pos/client-data';

import { scanBarcode } from '../../lib/barcode-scanner.js';
import { businessTypeOptions, suggestedUnitsFor, type BusinessType } from '../../lib/business-type-units.js';
import { capturePhoto, productPhotoFilename } from '../../lib/product-photo.js';
import { toClientProductRecord } from '../../lib/product-view-mapping.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { IconButton } from '../common/IconButton.js';
import { Modal } from '../common/Modal.js';

type AddEditProductModalProps = {
  onClose: () => void;
  onSaved: (saved: ClientProductRecord) => void;
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
  const gstApplicable = (settings.defaultTaxProfile?.rateBasisPoints ?? 0) > 0;
  const [taxProfileId, setTaxProfileId] = useState(product?.taxProfileId ?? settings.defaultTaxProfileId ?? '');
  const [taxProfiles, setTaxProfiles] = useState<ClientRemoteTaxProfileView[]>([]);
  const [foodType, setFoodType] = useState<'non_veg' | 'veg' | undefined>(product?.foodType);
  const [variants, setVariants] = useState<{ name: string; sellingPrice: string }[]>(
    product?.variants.map((variant) => ({ name: variant.name, sellingPrice: String(variant.sellingPrice) })) ?? []
  );
  const [imageUrl, setImageUrl] = useState(product?.imageUrl);
  const [imagePreview, setImagePreview] = useState(product?.imageUrl);
  const [trackInventory, setTrackInventory] = useState(product?.trackInventory ?? false);
  const [openingStock, setOpeningStock] = useState('');

  const [changingBusinessType, setChangingBusinessType] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    },
    []
  );

  useEffect(() => {
    void remoteApi.listUnits({ businessId: terminalContext.businessId }).then(setUnits);
  }, [remoteApi, terminalContext.businessId]);

  useEffect(() => {
    if (!gstApplicable) {
      return;
    }
    void remoteApi.listTaxProfiles({ businessId: terminalContext.businessId }).then(setTaxProfiles);
  }, [gstApplicable, remoteApi, terminalContext.businessId]);

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
    setUploadingPhoto(true);
    const previousImageUrl = imageUrl;
    let nextPreviewUrl: string | null = null;

    try {
      const captured = await capturePhoto(source);
      if (!captured) {
        return;
      }

      nextPreviewUrl = captured.previewUrl;
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
      localPreviewUrlRef.current = nextPreviewUrl;
      setImagePreview(nextPreviewUrl);

      const uploaded = await remoteApi.uploadProductImage(captured.blob, productPhotoFilename(captured.blob));
      setImageUrl(uploaded.url);
    } catch (cause) {
      // Do not leave a temporary preview suggesting an image was saved when
      // conversion or upload failed. Restore the persisted/no-image state.
      if (nextPreviewUrl) {
        URL.revokeObjectURL(nextPreviewUrl);
        if (localPreviewUrlRef.current === nextPreviewUrl) {
          localPreviewUrlRef.current = null;
        }
        setImagePreview(previousImageUrl);
        setImageUrl(previousImageUrl);
      }

      const message = cause instanceof Error ? cause.message : '';
      if (!/cancel/i.test(message)) {
        setError(message || 'Could not capture a photo');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addVariantRow = () => setVariants((previous) => [...previous, { name: '', sellingPrice: '' }]);
  const updateVariantRow = (index: number, patch: Partial<{ name: string; sellingPrice: string }>) =>
    setVariants((previous) => previous.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  const removeVariantRow = (index: number) =>
    setVariants((previous) => previous.filter((_, i) => i !== index));

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

  // Once variants exist, each one carries its own price -- a separate base
  // price would just be a second, easily-inconsistent place the same number
  // lives. The backend still requires *a* sellingPrice on the product
  // itself (used e.g. if this item is ever added without picking a
  // variant), so the first variant's price is reused for that rather than
  // asking the user to enter it twice.
  const hasVariants = variants.length > 0;
  const cleanedVariants = variants
    .filter((variant) => variant.name.trim().length > 0 && Number(variant.sellingPrice) > 0)
    .map((variant) => ({ name: variant.name.trim(), sellingPrice: Number(variant.sellingPrice) }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const unitId = units.find((unit) => unit.code === unitCode)?.id;
      const payload = {
        barcode: barcode.trim() || undefined,
        foodType,
        imageUrl,
        name: name.trim(),
        sellingPrice: hasVariants ? (cleanedVariants[0]?.sellingPrice ?? 0) : Number(price) || 0,
        taxProfileId: gstApplicable ? taxProfileId || undefined : undefined,
        unitId,
        variants: cleanedVariants
      };

      const result =
        isEditing && product
          ? await remoteApi.updateProduct(product.id, payload)
          : await remoteApi.createProduct({
              ...payload,
              businessId: terminalContext.businessId,
              openingStock: trackInventory ? Number(openingStock) || 0 : undefined,
              trackInventory
            });

      const clientRecord = toClientProductRecord(result);
      await store.products.upsertProducts([clientRecord]);
      onSaved(clientRecord);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this product');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    name.trim().length > 0 &&
    (hasVariants ? cleanedVariants.length > 0 : Number(price) > 0) &&
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

        {!hasVariants && (
          <input
            className={inputClassName}
            inputMode="decimal"
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Price"
            value={price}
          />
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Variants (optional) — e.g. Half / Full portions
          </p>
          {hasVariants && (
            <p className="mb-2 text-xs text-ink-faint">Priced per variant below, instead of one product price.</p>
          )}
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div className="flex gap-2" key={index}>
                <input
                  className={inputClassName}
                  onChange={(event) => updateVariantRow(index, { name: event.target.value })}
                  placeholder="Name (e.g. Half)"
                  value={variant.name}
                />
                <input
                  className={inputClassName}
                  inputMode="decimal"
                  onChange={(event) => updateVariantRow(index, { sellingPrice: event.target.value })}
                  placeholder="Price"
                  value={variant.sellingPrice}
                />
                <IconButton
                  label="Remove variant"
                  onClick={() => removeVariantRow(index)}
                  tone="danger"
                  type="button"
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            ))}
            <Button icon={<Plus size={16} />} onClick={addVariantRow} size="sm" type="button" variant="outline">
              Add variant
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Food type (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button className={chipClassName(foodType === undefined)} onClick={() => setFoodType(undefined)} type="button">
              Not set
            </button>
            <button className={chipClassName(foodType === 'veg')} onClick={() => setFoodType('veg')} type="button">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-success-500" />
              Veg
            </button>
            <button
              className={chipClassName(foodType === 'non_veg')}
              onClick={() => setFoodType('non_veg')}
              type="button"
            >
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-danger-500" />
              Non-veg
            </button>
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                className={chipClassName(trackInventory)}
                onClick={() => setTrackInventory(true)}
                type="button"
              >
                Track stock
              </button>
              <button
                className={chipClassName(!trackInventory)}
                onClick={() => setTrackInventory(false)}
                type="button"
              >
                Don't track (made-to-order / loose)
              </button>
            </div>
            {trackInventory && (
              <input
                className={inputClassName}
                inputMode="numeric"
                onChange={(event) => setOpeningStock(event.target.value)}
                placeholder="Opening stock (how many you have right now)"
                value={openingStock}
              />
            )}
          </div>
        )}

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

        {gstApplicable && taxProfiles.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">GST on this product</p>
            <div className="flex flex-wrap gap-2">
              {taxProfiles.map((profile) => (
                <button
                  className={chipClassName(profile.id === taxProfileId)}
                  key={profile.id}
                  onClick={() => setTaxProfileId(profile.id)}
                  type="button"
                >
                  {profile.rateBasisPoints > 0 ? `${profile.rateBasisPoints / 100}%` : 'No GST'}
                </button>
              ))}
            </div>
          </div>
        )}

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
