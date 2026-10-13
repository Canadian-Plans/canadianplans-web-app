import { CpAsset, CpPriceCircle } from '@canadian-plans/ui/canadian-plans';
import { homeAssets, homeCopy } from '@content/home';
function DesktopInternetArt() {
  return (
    <div
      className="bg-[var(--cp-color-sky)] h-[var(--cp-home-art-400)] overflow-clip relative rounded-[var(--cp-home-art-28)] shrink-0 w-[var(--cp-home-art-520)]"
      data-node-id="64:7"
      data-name="Visual"
    >
      <div
        className="absolute bg-[var(--cp-color-white)] border-[length:var(--cp-home-stroke-desktop)] border-[color:var(--cp-color-ink)] border-solid h-[var(--cp-home-art-150)] left-[var(--cp-home-art-150)] rounded-[var(--cp-home-art-16)] top-[var(--cp-home-art-180)] w-[var(--cp-home-art-200)]"
        data-node-id="64:8"
        data-name="Rectangle"
      />
      <div
        className="absolute h-[var(--cp-home-art-110)] left-[var(--cp-home-art-120)] top-[var(--cp-home-art-112)] w-[var(--cp-home-art-260)]"
        data-node-id="64:9"
        data-name="Polygon"
      >
        <div className="absolute bottom-1/4 left-[17.76%] right-[17.76%] top-[3.05%]">
          <CpAsset asset={homeAssets['0-imgPolygon']} />
        </div>
      </div>
      <div
        className="absolute bg-[var(--cp-color-blush)] border-[length:var(--cp-home-stroke-desktop)] border-[color:var(--cp-color-ink)] border-solid h-[var(--cp-home-art-72)] left-[var(--cp-home-art-226)] rounded-tl-[var(--cp-home-art-24)] rounded-tr-[var(--cp-home-art-24)] top-[var(--cp-home-art-258)] w-[var(--cp-home-art-48)]"
        data-node-id="64:10"
        data-name="Rectangle"
      />
      <div
        className="absolute bg-[var(--cp-color-lemon)] border-[length:var(--cp-home-stroke-desktop)] border-[color:var(--cp-color-ink)] border-solid left-[var(--cp-home-art-172)] rounded-[var(--cp-home-art-10)] size-[var(--cp-home-art-44)] top-[var(--cp-home-art-214)]"
        data-node-id="64:11"
        data-name="Rectangle"
      />
      <div
        className="absolute left-[var(--cp-home-art-260)] size-[var(--cp-home-art-40)] top-[var(--cp-home-art-50)]"
        data-node-id="64:12"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['0-imgEllipse1']} />
        </div>
      </div>
      <div
        className="absolute left-[var(--cp-home-art-242)] size-[var(--cp-home-art-76)] top-[var(--cp-home-art-32)]"
        data-node-id="64:13"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['0-imgEllipse2']} />
        </div>
      </div>
      <div
        className="absolute left-[var(--cp-home-art-224)] size-[var(--cp-home-art-112)] top-[var(--cp-home-art-14)]"
        data-node-id="64:14"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['0-imgEllipse3']} />
        </div>
      </div>
      <div
        className="absolute flex items-center justify-center left-[var(--cp-home-art-330)] size-[var(--cp-home-art-185-228)] top-[var(--cp-home-art-1-18)] cp-home-internet-price-desktop"
        data-node-id="64:15"
      >
        <CpPriceCircle
          label={homeCopy.internet.circleLabel}
          amount={homeCopy.internet.circleAmount}
          suffix={homeCopy.internet.circleSuffix}
        />
      </div>
    </div>
  );
}
function MobileInternetArt() {
  return (
    <div
      className="bg-[var(--cp-color-sky)] h-[var(--cp-home-art-250)] overflow-clip relative rounded-[var(--cp-home-art-28)] shrink-0 w-full"
      data-node-id="196:121"
      data-name="Visual"
    >
      <div
        className="absolute bg-[var(--cp-color-white)] border-[length:var(--cp-home-art-1-8)] border-[color:var(--cp-color-ink)] border-solid h-[var(--cp-home-art-90)] left-[var(--cp-home-art-78)] rounded-[var(--cp-home-art-9-6)] top-[var(--cp-home-art-108)] w-[var(--cp-home-art-120)]"
        data-node-id="196:122"
        data-name="Rectangle"
      />
      <div
        className="absolute h-[var(--cp-home-art-66)] left-[var(--cp-home-art-60)] top-[var(--cp-home-art-67)] w-[var(--cp-home-art-156)]"
        data-node-id="196:123"
        data-name="Polygon"
      >
        <div className="absolute bottom-1/4 left-[17.76%] right-[17.76%] top-[3.05%]">
          <CpAsset asset={homeAssets['1-imgPolygon']} />
        </div>
      </div>
      <div
        className="absolute bg-[var(--cp-color-blush)] border-[length:var(--cp-home-art-1-8)] border-[color:var(--cp-color-ink)] border-solid h-[var(--cp-home-art-43-2)] left-[var(--cp-home-art-124)] rounded-tl-[var(--cp-home-art-14-4)] rounded-tr-[var(--cp-home-art-14-4)] top-[var(--cp-home-art-155)] w-[var(--cp-home-art-28-8)]"
        data-node-id="196:124"
        data-name="Rectangle"
      />
      <div
        className="absolute bg-[var(--cp-color-lemon)] border-[length:var(--cp-home-art-1-8)] border-[color:var(--cp-color-ink)] border-solid left-[var(--cp-home-art-91)] rounded-[var(--cp-home-art-6)] size-[var(--cp-home-art-26-4)] top-[var(--cp-home-art-128)]"
        data-node-id="196:125"
        data-name="Rectangle"
      />
      <div
        className="absolute left-[var(--cp-home-art-144)] size-[var(--cp-home-art-24)] top-[var(--cp-home-art-30)]"
        data-node-id="196:126"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['1-imgEllipse']} />
        </div>
      </div>
      <div
        className="absolute left-[var(--cp-home-art-133)] size-[var(--cp-home-art-45-6)] top-[var(--cp-home-art-19)]"
        data-node-id="196:127"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['1-imgEllipse1']} />
        </div>
      </div>
      <div
        className="absolute left-[var(--cp-home-art-122)] size-[var(--cp-home-art-67-2)] top-[var(--cp-home-art-8)]"
        data-node-id="196:128"
        data-name="Ellipse"
      >
        <div className="absolute inset-[0_5.45%_69.52%_5.45%]">
          <CpAsset asset={homeAssets['1-imgEllipse2']} />
        </div>
      </div>
      <div
        className="absolute flex items-center justify-center left-[var(--cp-home-art-186-32)] size-[var(--cp-home-art-114-842)] top-[var(--cp-home-art-3-85)] cp-home-internet-price-mobile"
        data-node-id="196:129"
      >
        <CpPriceCircle
          label={homeCopy.internet.circleLabel}
          amount={homeCopy.internet.circleAmount}
          suffix={homeCopy.internet.circleSuffix}
        />
      </div>
    </div>
  );
}
export function InternetArt() {
  return (
    <>
      <div className="cp-home-desktop-art">
        <DesktopInternetArt />
      </div>
      <div className="cp-home-mobile-art">
        <MobileInternetArt />
      </div>
    </>
  );
}
