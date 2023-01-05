import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  Container,
  Offcanvas,
  Row,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import { useExtensions, useHost } from "@adobe/uix-host-react";
import { Text } from "./Text";
import { PreviewPane } from "./PreviewPane";
import "./Gallery.css";

function normalizeLanguage(bcpLocale = navigator.language) {
  return new Intl.Locale(bcpLocale).language;
}

const gapCss = "calc(var(--bs-gutter-x) * .5)";

export function Gallery({ items }) {
  const [show, setShow] = useState({});
  const [language, setLanguage] = useState(normalizeLanguage);
  const [paintings, setPaintings] = useState(items);
  const { extensions } = useExtensions(() => ({
    requires: {
      previews: ["getTitle", "show"],
    },
  }));
  
  const {host} = useHost();

  const portrait = window.matchMedia("(orientation: portrait)").matches;

  useEffect(() => {
    Promise.all(
      items.map(async (item) => {
        const titleProviders = (
          await Promise.all(
            extensions.map(async ({ id, apis }) => ({
              guestId: id,
              apis,
              title: await apis.previews.getTitle(item.id, language),
            }))
          )
        ).filter(({ title }) => !!title);
        if (titleProviders.length === 0) {
          return item;
        }
        const { apis, title, guestId } =
          titleProviders.find((t) => t && t.title.lang === language) ||
          titleProviders[0];
        return {
          ...item,
          show: async () => {
            const uiConfig = await apis.previews.show(item.id, language);
            setShow({ ...item, guestId, uiConfig, title });
          },
          title,
        };
      })
    )
      .then(setPaintings)
      .catch((e) => {
        throw new Error(e);
      });
  }, [extensions, items, language]);

  return (
    <ThemeProvider breakpoints={["lg", "md", "sm"]} minBreakpoint="sm">
      <Container style={{ width: "80vw", height: "100vh" }}>
        <Row style={{ paddingTop: gapCss, paddingBottom: gapCss }}>
          <Col>
            <ToggleButtonGroup
              name="language"
              type="radio"
              value={language}
              size="sm"
              onChange={(value) => {
                setLanguage(value);
		host.shareContext({ lang: value })
              }}
            >
              <ToggleButton
                variant="outline-info"
                id="language_en"
                name="language"
                value="en"
              >
                🇺🇸
              </ToggleButton>
              <ToggleButton
                variant="outline-info"
                id="language_nl"
                name="language"
                value="nl"
              >
                🇳🇱
              </ToggleButton>
            </ToggleButtonGroup>
          </Col>
        </Row>
        <Row
          sm={2}
          md={3}
          lg={4}
          style={{
            alignItems: "stretch",
            gap: gapCss,
          }}
        >
          {paintings.map((painting) => (
            <Col key={painting.id}>
              <Card
                style={{ height: "100%", cursor: "pointer" }}
                onClick={painting.show}
              >
                <Card.Img
                  style={{ objectFit: "cover" }}
                  variant="top"
                  src={painting.src}
                />
                <Card.Body>
                  <Card.Subtitle>
                    <Text>{painting.title}</Text>
                  </Card.Subtitle>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        <Row>
          <Offcanvas
            show={!!show.id}
            onHide={() => setShow({})}
	    backdrop={false}
            placement={portrait ? "bottom" : "end"}
            name={`preview-${show.id}`}
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>
                <Text>{show.title}</Text>
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <figure className="frame-wrapper">
                <PreviewPane {...show} />
                <figcaption style={{ fontStyle: "italic", fontSize: "0.5rem" }}>
                  courtesy of {show.guestId}
                </figcaption>
              </figure>
            </Offcanvas.Body>
          </Offcanvas>
        </Row>
      </Container>
    </ThemeProvider>
  );
}
