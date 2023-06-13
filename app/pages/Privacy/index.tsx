/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import _map from 'lodash/map'

import {
  CONTACT_EMAIL, SECURITY_EMAIL, DOCS_URL,
} from 'redux/constants'

const serviceProviders: {
  company: string
  purpose: string
  dataSubjects: string
  location: string
}[] = [
  {
    company: 'Paddle.com Market Limited',
    purpose: 'Payment and subscriptions',
    dataSubjects: 'Customers',
    location: 'United Kingdom',
  },
  {
    company: 'Fastmail Pty Ltd',
    purpose: 'Business emails',
    dataSubjects: 'Customers',
    location: 'Australia',
  },
  {
    company: 'Cloudflare, Inc.',
    purpose: 'Cloud services',
    dataSubjects: 'Website Visitors, Customers, End Users',
    location: 'United States',
  },
  {
    company: 'Wildbit, LLC (Postmark)',
    purpose: 'Transactional and marketing emails',
    dataSubjects: 'Customers',
    location: 'United States',
  },
  {
    company: 'New Relic, Inc.',
    purpose: 'Error tracking',
    dataSubjects: 'Website Visitors, Customers, End Users',
    location: 'United States',
  },
]

const Features = (): JSX.Element => {
  return (
    <div className='bg-gray-50 dark:bg-slate-900'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>Privacy Policy</h1>
        <p className='mt-4 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          This Swetrix Privacy Policy (“Policy”, "Privacy Policy") outlines the personal information that we gather, how we use that personal information, and the options you have to access, correct, or delete such personal information.
          <br />
          By visiting swetrix.com and using the Services provided here, you agree to the terms outlined in this Privacy Policy. Unless otherwise defined in this document, the terms used in this Privacy Policy have the same meanings as in our Terms and Conditions.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>1. Policy application</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          This Privacy Policy applies to the following data subjects:
          <br />

          {'- '}
          <b>Customers:</b>
          {' '}
          Those who register for an account on Swetrix and to whom Swetrix provides its Services. For purposes of this Policy, “Services” refers to all of the solutions offered, marketed, or sold by us.
          <br />
          {'- '}
          <b>Website Visitors:</b>
          {' '}
          Those who visit our Websites, which may optionally provide an email address or other information to receive communications from us, or give us feedback. For the purposes of this Policy, “Websites” refer to swetrix.com as well as any other websites we operate on our own behalf and that link to this Policy. For clarity, “Websites” does not include any sites owned or operated by our Customers.
          <br />
          {'- '}
          <b>End Users:</b>
          {' '}
          Those who access or use our Customers websites, networks, APIs, and applications.
          <br />

          This Privacy Policy does not apply to our Customers websites, networks, APIs, and applications, which may have their own terms and privacy policies. Our Customers are solely responsible for establishing policies for and ensuring compliance with all applicable laws and regulations.
          <br />

          Swetrix’s Websites and Services are not intended for, nor designed to attract, individuals under the age of eighteen. Swetrix does not knowingly collect personal information from any person under the age of eighteen. You represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Websites and Services.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>2. Information we collect</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We may collect the following types of data in order to provide and improve our Services:
          <br />
          {'- '}
          <b>Personal Data:</b>
          {' '}
          While using our Services, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you. Personally identifiable information may include, but is not limited to your name, email address and billing addresses necessary to process payment and delivery of Services.
          <br />
          {'- '}
          <b>Payment Information:</b>
          {' '}
          We do not require our Customers to have payment information on file with us unless they have a paid subscription to our Services.
          <br />
          When you sign up for one of our paid Subscriptions, you must provide payment and billing information. The information you will need to submit depends on which payment method you choose. For clarity, we do not store full credit card numbers or personal account numbers.
          <br />
          {'- '}
          <b>Usage Data:</b>
          {' '}
          When you visit our Websites, we gather certain information and store it in log files to be able to provide you with our Services. This information may include but is not limited to Internet Protocol (IP) addresses, device or system information, URLs of referrer pages, browser information and language preferences.
          <br />
          For clarity, the purpose of these log files is to enable us to operate and provide you with our Services, and to monitor for overall trends on our Websites and for security. These log files are not shared with third parties.
          <br />
          {'- '}
          <b>Cookie Data:</b>
          {' '}
          We use essential cookies on our Websites to provide our Services. Without these cookies, the services that you have asked for cannot be provided, and we only use these cookies to provide you those services.
          <br />
          These cookies are essential for the functioning of our Websites. For example, they help to authenticate you and to prevent fraudulent use of your account.
          <br />
          You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some parts of our Websites and Services.
          <br />
          At this time, our Websites do not respond to Do Not Track beacons sent by browser plugins.
          <br />
          {'- '}
          <b>Log Data:</b>
          {' '}
          We process End Users information on behalf of our Customers. This information is processed when End Users access or use our Customers domains, websites, APIs, applications, devices, endpoints, and networks that use our Services.
          <br />
          The information processed may include but is not limited to IP addresses, device or system information, and other information about the traffic on our Customers websites, devices, applications, and/or networks (collectively, “Log Data”). You can find more information on the data collected and how we process it
          {' '}
          <a className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' href={`${DOCS_URL}/swetrix-js-reference#trackviews`} target='_blank' rel='noreferrer noopener'>here</a>
          .
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>3. How we use information we collect</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We only processes personal information in a way that is relevant for the purpose for which it was collected or authorized:
          <br />
          - To enable you to access and use the Websites and Services.
          <br />
          - To operate and improve the Websites and Services.
          <br />
          - To send transactional messages, provide customer support, updates, security alerts, and account related messages.
          <br />
          - To process and complete transactions, and send you related information, including purchase confirmations and invoices.
          <br />
          - To monitor and analyze overall trends, usage, and activities in connection with the Websites and Services.
          <br />
          - To create, publish or send marketing emails, news or advertising material. For clarity, we do not send marketing emails without your explicit consent.
          <br />
          - To comply with legal obligations to investigate and prevent fraudulent transactions, unauthorized access, and other illegal activities.
          <br />
          - To personalize the Websites and Services.
          <br />
          - To process your data for other purposes for which we obtain your consent.
          <br />
          We use and process the Log Data from End Users to fulfill our obligations under our Customer agreements and as may be required by law. We act as a data processor and service provider pursuant to data processing instructions by our Customers.
          <br />
          We may use the Usage and Log Data to assemble non-personally identifiable web traffic reports and statistics. These reports and statistics may be shared with third parties.
        </p>
        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>4. UK and EU residents</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          Please note that the “personal information” referenced in this Privacy Policy means “personal data” as that term is defined under the European Union (“EU”) General Data Protection Regulations (“GDPR”) and its United Kingdom (“UK”) GDPR counterpart. Swetrix is the data controller for the Personal Data of Customers and Website Visitors, but not for the Personal Data of End Users. We process the Personal Data of End Users on behalf of our Customers.
          <br />
          If you are an individual from the European Economic Area (the “EEA”), the UK or Switzerland, please note that our legal basis for collecting and using your personal information will depend on the personal information collected and the specific context in which we collect it.
          <br />
          However, we will normally collect personal data from you only (i) where the processing is in our legitimate interests and not overridden by your rights; (ii) where we need the personal data to perform a contract with you or (iii) where we have your consent to do so. In some cases, we may also have a legal obligation to collect personal data from you.
          <br />
          Please note that in most cases, if you do not provide the requested information, we will not be able to provide the requested service to you. In some cases, we may also have a legal obligation to collect personal information from you, or may need the personal information to protect your vital interests or those of another person.
          <br />
          Where we rely on your consent to process your personal data, you have the right to withdraw or decline consent at any time. Where we rely on our legitimate interests to process your personal data, you have the right to object.
          <br />
          If you have any questions about or need further information concerning the legal basis on which we collect and use your personal information, please contact us at&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>5. California Residents</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We do not sell, rent, or share personal information with third parties as defined under the California Consumer Privacy Act of 2018 (California Civil Code Sec. 1798.100 et seq.), nor do we sell, rent, or share personal information with third parties for their direct marketing purposes as defined under California Civil Code Sec. 1798.83.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>6. Retention of data</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We may retain your information for as long as your account is active or as needed to provide you services, comply with our legal obligations, resolve disputes and enforce our agreements. In certain circumstances we may be required by law to retain your personal information, or may need to retain your personal information in order to continue providing a service.
          <br />
          Even if you delete your account, keep in mind that the deletion by our third party providers may not be immediate and that the deleted information may persist in backup copies for a reasonable period of time.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>7. Transfer of data</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside Germany and choose to provide information to us, please note that we transfer the data, including Personal Data, to Germany and process it there.
          <br />
          Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>8. Information sharing</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We do not sell or rent personal information.
          <br />
          We may disclose personal information to service providers who help us run the Services and our business (“Service Providers”). These Service Providers may only process personal information pursuant to our instructions and in compliance both with this Privacy Policy and other applicable security measures and regulations.
          <br />
          {/* Before engaging any Service Provider, we perform due diligence, including a security assessment. Our Service Providers are subject to strict contract terms designed to ensure that these Service Providers process personal data only for the purposes of providing services to Swetrix and in accordance with our commitments to applicable data protection laws.
            <br /> */}
          The following Service Providers may be considered our "sub-processors" under GDPR. We only share what's required for their purpose.
          <br />
          <div className='mt-8 flex flex-col'>
            <div className='-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8'>
              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 200 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th scope='col' className='py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50 sm:pl-6'>
                          Company
                        </th>
                        <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                          Purpose
                        </th>
                        <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                          Data subjects
                        </th>
                        <th scope='col' className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'>
                          Corporate location
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-slate-800'>
                      {_map(serviceProviders, ({
                        company, purpose, dataSubjects, location,
                      }) => (
                        <tr key={company}>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50 sm:pl-6'>{company}</td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>{purpose}</td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>{dataSubjects}</td>
                          <td className='whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-50'>{location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <br />
          In addition to sharing with Service Providers as described above, we also may share your information with others in the following circumstances:
          <br />
          - In the event of a merger, sale, change in control, or reorganization of all or part of our business.
          <br />
          - When we are required to disclose personal information to respond to subpoenas, court orders, or legal process, or to establish or exercise our legal rights or defend against legal claims.
          <br />
          - Where we have a good-faith belief sharing is necessary to investigate, prevent or take action regarding illegal activities, suspected fraud, situations involving potential threats to the physical safety of any person, or violations of our Terms and Conditions, or as otherwise required to comply with our legal obligations.
          <br />
          - Other purposes for which we obtain your consent.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>9. Data subject rights</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We would like to make sure you are fully aware of all of your data protection rights. In certain circumstances, you have the following data protection rights:
          <br />
          {'- '}
          <b>The right to access:</b>
          {' '}
          You have the right to request our Company for copies of your personal data.
          <br />
          {'- '}
          <b>The right to rectification:</b>
          {' '}
          You have the right to request that our Company corrects any information you believe is inaccurate. You also have the right to request our Company to complete the information you believe is incomplete.
          <br />
          {'- '}
          <b>The right to erasure:</b>
          {' '}
          You have the right to request that our Company erases your personal data, under certain conditions.
          <br />
          {'- '}
          <b>The right to restrict processing:</b>
          {' '}
          You have the right to request that our Company restricts the processing of your personal data, under certain conditions.
          <br />
          {'- '}
          <b>The right to object to processing:</b>
          {' '}
          You have the right to object to our Company's processing of your personal data, under certain conditions.
          <br />
          {'- '}
          <b>The right to data portability:</b>
          {' '}
          You have the right to request that our Company transfers the data that we have collected to another organization, or directly to you, under certain conditions.
          <br />
          If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us via email at&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            {CONTACT_EMAIL}
          </a>
          . Please note that we may ask you to verify your identity before responding to such requests.
          <br />
          We have no direct relationship with the End Users. Our Customers are solely responsible for ensuring compliance with all applicable laws and regulations with respect to their website users.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>10. Communication preferences</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          Swetrix will send you commercial communications based on the communication preferences in your account settings. Swetrix also will send you service-related communications. You may manage your receipt of commercial communications by clicking on the “unsubscribe” link located on the bottom of such emails, through your account settings if you have a Swetrix account, or you may send a request to&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>11. Data security</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We take all reasonable steps to protect information we receive from you from loss, misuse or unauthorized access, disclosure, alteration and/or destruction. We have put in place appropriate physical, technical and administrative measures to safeguard and secure your information, and we make use of privacy-enhancing technologies such as encryption. If you have any questions about the security of your personal information, you can contact us at&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            {SECURITY_EMAIL}
          </a>
          .
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>12. Notification of changes</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          If we make changes to this Policy that we believe materially impact the privacy of your personal information, we will promptly provide notice of any such changes (and, where necessary, obtain consent), as well as post the updated Policy on this website noting the date of any changes via the "Last updated" date at the bottom of this Privacy Policy. We encourage you to periodically review this page for the latest information on our privacy practices.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>13. Business transactions</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          We may assign or transfer this Policy, as well as information covered by this Policy, in the event of a merger, sale, change in control, or reorganization of all or part of our business.
        </p>

        <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4'>14. Contact</h3>
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          If you have any questions about this Privacy Policy, you can contact us by email at&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <hr className='mt-10 mb-4 border-gray-200 dark:border-gray-600' />
        <p className='text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          <i>Last updated: August 14, 2022.</i>
        </p>
      </div>
    </div>
  )
}

export default Features
