import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Img,
  Hr,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface Submission {
  name: string;
  answers: string[];
  image_urls: string[];
}

interface NewsletterTemplateProps {
  date?: string; // Kept for backwards compatibility but not used in template
  intro: string;
  outro: string;
  submissions: Submission[];
  questions: string[];
}

export const NewsletterTemplate: React.FC<NewsletterTemplateProps> = ({
  intro,
  outro,
  submissions,
  questions,
}) => {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSectionStyle}>
            <Heading style={titleStyle}>Hello Friends!</Heading>
            <Heading style={introHeadingStyle}>{intro}</Heading>
          </Section>

          <Hr style={dividerStyle} />

          {/* Submissions */}
          {submissions.map((submission, index) => (
            <React.Fragment key={index}>
              <Section style={cardStyle}>
                <Section style={personHeaderStyle}>
                  <Heading style={personNameStyle}>{submission.name}</Heading>
                </Section>

                {/* 2-column layout: Answers on left, Images on right */}
                <Row>
                  {/* Left Column: Answers */}
                  <Column style={answersColumnStyle}>
                    {submission.answers.map((answer, answerIndex) => (
                      <Section key={answerIndex} style={answerSectionStyle}>
                        <Text style={questionStyle}>
                          {questions[answerIndex] || `Question ${answerIndex + 1}`}
                        </Text>
                        <Text style={answerTextStyle}>{answer}</Text>
                      </Section>
                    ))}
                  </Column>

                  {/* Right Column: Images */}
                  {submission.image_urls && submission.image_urls.length > 0 && (
                    <Column style={imagesColumnStyle}>
                      {submission.image_urls.map((imageUrl, imageIndex) => (
                        <Section key={imageIndex} style={imageWrapperStyle}>
                          <Img
                            src={imageUrl}
                            alt={`${submission.name}'s image ${imageIndex + 1}`}
                            style={imageStyle}
                          />
                        </Section>
                      ))}
                    </Column>
                  )}
                </Row>
              </Section>

              {index < submissions.length - 1 && <Hr style={dividerStyle} />}
            </React.Fragment>
          ))}

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerSectionStyle}>
            <Text style={outroStyle}>{outro}</Text>
            <Text style={disclaimerStyle}>The intro and outro were AI-generated.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
// Using web-safe fonts that work in email clients
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#FFFBF1',
  fontFamily: 'Georgia',
  margin: 0,
  padding: '20px',
  fontSize: '16px',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  maxWidth: '800px',
  margin: '0 auto',
  padding: '40px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
};

const headerSectionStyle: React.CSSProperties = {
  marginBottom: '30px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1a1a1a',
  fontFamily: 'Georgia',
  fontWeight: 700,
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const introHeadingStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1a1a1a',
  fontFamily: 'Georgia',
  fontWeight: 400,
  lineHeight: '1.6',
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  borderColor: '#E5E5E5',
  borderWidth: '1px',
  borderStyle: 'solid',
  margin: '30px 0',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FAFAFA',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '30px',
};

const personHeaderStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const personNameStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1a1a1a',
  fontFamily: 'Georgia',
  fontWeight: 700,
  margin: 0,
};

const answersColumnStyle: React.CSSProperties = {
  width: '60%',
  verticalAlign: 'top',
  paddingRight: '12px',
};

const imagesColumnStyle: React.CSSProperties = {
  width: '40%',
  verticalAlign: 'top',
  paddingLeft: '12px',
};

const answerSectionStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const questionStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#666666',
  fontFamily: 'Georgia',
  fontWeight: 700,
  marginBottom: '8px',
  textTransform: 'lowercase',
  letterSpacing: '0.5px',
};

const answerTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontFamily: 'Georgia',
  lineHeight: '1.6',
  margin: 0,
};

const imageWrapperStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: '8px',
  display: 'block',
  maxWidth: '100%',
};

const footerSectionStyle: React.CSSProperties = {
  marginTop: '30px',
  paddingTop: '20px',
};

const outroStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1a1a1a',
  fontFamily: 'Georgia',
  lineHeight: '1.6',
  fontStyle: 'italic',
  margin: 0,
  textAlign: 'center',
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: '8px',
  color: '#999999',
  fontFamily: 'Georgia',
  margin: '20px 0 0 0',
  textAlign: 'center',
};

export default NewsletterTemplate;

