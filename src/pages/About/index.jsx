import React from "react";
import Title from "components/Title";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";

const About = () => {
  const { t } = useTranslation("common");

  return (
    <Title title={t("titles.about")}>
      <div className="bg-gray-50 dark:bg-gray-800 min-h-min-footer">
        <div className="w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
            {t("titles.about")}
          </h1>
          <div className="px-4 sm:px-6 sm:text-center">
            <div>
              <h1 className="text-4xl text-center font-extrabold dark:text-white text-center">
                Swetrix
              </h1>
              <p className="mt-4 text-2xl font-bold text-gray-500 dark:text-white text-center">
                <Trans
                  t={t}
                  i18nKey="main.slogan"
                  components={{
                    span: <span className="" />,
                  }}
                />
              </p>
              <p className="text-base text-gray-500 sm:mt-2 text-base sm:text-xl lg:text-lg xl:text-xl">
                {t("main.description")}
                <br />
                {t("main.trackEveryMetric")}
              </p>
            </div>
          </div>
          <div className="mt-35 sm:mt-24 lg:mt-10 lg:col-span-6">
            <div className="sm:max-w-2xl sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden">
              <div className="px-4 py-8 sm:px-10">
                <p className="text-4xl dark:text-white text-center font-bold">
                  Our Leadership
                </p>
              </div>
              <div>
                <ul className="grid md:grid-cols-3 justify-center items-center">
                  <li className="flex flex-col items-center m-3">
                    <img
                      src="/assets/andrii-120px.png"
                      className="aspect-square w-full h-full shrink-0 overflow-hidden rounded-full m-2 max-w-[8em] max-w-[8em]"
                      loading="lazy"
                      alt="andrii"
                    />
                    <div className="flex items-center gap-x-fixed-md">
                      <h3 className="text-gray-900 dark:text-white text-center text-xl">
                        Andrii R.
                      </h3>
                    </div>
                    <p className="text-gray-900 dark:text-white text-center text-lg">
                      Fullstack & Founder
                    </p>
                    <a
                      className="text-gray-900 dark:text-white text-center mx-auto underline hover:no-underline"
                      href="#"
                    >
                      Watch Bio
                    </a>
                  </li>
                  <li className="flex flex-col items-center m-3">
                    <img
                      src="/assets/andrii-120px.png"
                      className="aspect-square w-full h-full shrink-0 overflow-hidden rounded-full m-2 max-w-[8em] max-w-[8em]"
                      loading="lazy"
                      alt="andrii"
                    />
                    <div className="flex items-center gap-x-fixed-md">
                      <h3 className="text-gray-900 dark:text-white text-center text-xl">
                        Andrii R.
                      </h3>
                    </div>
                    <p className="text-gray-900 dark:text-white text-center text-lg">
                      Fullstack & Founder
                    </p>
                    <a
                      className="text-gray-900 dark:text-white text-center mx-auto underline hover:no-underline"
                      href="#"
                    >
                      Watch Bio
                    </a>
                  </li>
                  <li className="flex flex-col items-center m-3">
                    <img
                      src="/assets/andrii-120px.png"
                      className="aspect-square w-full h-full shrink-0 overflow-hidden rounded-full m-2 max-w-[8em] max-w-[8em]"
                      loading="lazy"
                      alt="andrii"
                    />
                    <div className="flex items-center gap-x-fixed-md">
                      <h3 className="text-gray-900 dark:text-white text-center text-xl">
                        Andrii R.
                      </h3>
                    </div>
                    <p className="text-gray-900 dark:text-white text-center text-lg">
                      Fullstack & Founder
                    </p>
                    <a
                      className="text-gray-900 dark:text-white text-center mx-auto underline hover:no-underline"
                      href="#"
                    >
                      Watch Bio
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-35 sm:mt-24 lg:mt-10 lg:col-span-6">
            <div className="sm:max-w-2xl sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden">
              <div className="px-4 py-8 sm:px-10">
                <p className="text-4xl dark:text-white text-center font-bold">
                  News
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Title>
  );
};

export default About;
